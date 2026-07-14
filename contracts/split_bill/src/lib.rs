#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Map, Vec,
};

// ── Data Structures ──────────────────────────────────────────────────

/// Status of a split bill session
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BillStatus {
    /// Waiting for all participants to pay their shares
    Pending,
    /// All shares collected — organizer can claim funds
    Completed,
    /// Deadline passed without full collection — participants can refund
    Expired,
}

/// Individual participant in a split bill
#[contracttype]
#[derive(Clone, Debug)]
pub struct Participant {
    pub address: Address,
    pub share_amount: i128,
    pub has_paid: bool,
}

/// A single split bill session stored on-chain
#[contracttype]
#[derive(Clone, Debug)]
pub struct SplitBillSession {
    pub organizer: Address,
    pub token: Address,
    pub target_amount: i128,
    pub collected_amount: i128,
    pub deadline: u64,
    pub status: BillStatus,
    pub participants: Vec<Participant>,
}

// ── Storage Keys ─────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Auto-incrementing bill counter
    BillCounter,
    /// Maps bill_id -> SplitBillSession
    Bill(u64),
}

// ── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct SplitBillManager;

#[contractimpl]
impl SplitBillManager {
    /// Creates a new split bill escrow session.
    ///
    /// # Arguments
    /// * `organizer` - The address of the bill creator who will receive funds
    /// * `token` - The token contract address (e.g. USDC)
    /// * `participant_addrs` - Vector of participant wallet addresses
    /// * `amounts` - Vector of amounts each participant owes (same order)
    /// * `deadline` - Unix timestamp after which the bill expires
    ///
    /// # Returns
    /// The unique bill ID for this session
    pub fn create_bill(
        env: Env,
        organizer: Address,
        token: Address,
        participant_addrs: Vec<Address>,
        amounts: Vec<i128>,
        deadline: u64,
    ) -> u64 {
        // Require the organizer to authorize this call
        organizer.require_auth();

        // Validate inputs
        assert!(
            participant_addrs.len() == amounts.len(),
            "participants and amounts length mismatch"
        );
        assert!(!participant_addrs.is_empty(), "must have at least one participant");
        assert!(deadline > 0, "deadline must be positive");

        // Build participant list and calculate target
        let mut participants = Vec::new(&env);
        let mut target_amount: i128 = 0;

        for i in 0..participant_addrs.len() {
            let addr = participant_addrs.get(i).unwrap();
            let amount = amounts.get(i).unwrap();
            assert!(amount > 0, "share amount must be positive");

            participants.push_back(Participant {
                address: addr,
                share_amount: amount,
                has_paid: false,
            });

            target_amount += amount;
        }

        // Get next bill ID (auto-increment)
        let bill_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::BillCounter)
            .unwrap_or(0)
            + 1;

        // Store the session
        let session = SplitBillSession {
            organizer,
            token,
            target_amount,
            collected_amount: 0,
            deadline,
            status: BillStatus::Pending,
            participants,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &session);

        // Update counter
        env.storage()
            .instance()
            .set(&DataKey::BillCounter, &bill_id);

        bill_id
    }

    /// Allows a participant to pay their share into the escrow.
    ///
    /// Transfers USDC from the participant's wallet into the contract.
    /// Automatically marks the bill as Completed if all shares are paid.
    ///
    /// # Arguments
    /// * `bill_id` - The ID of the split bill session
    /// * `participant` - The address of the participant paying
    pub fn pay_share(env: Env, bill_id: u64, participant: Address) {
        // Require the participant to authorize this payment
        participant.require_auth();

        let mut session: SplitBillSession = env
            .storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .expect("bill not found");

        assert!(
            session.status == BillStatus::Pending,
            "bill is not in pending status"
        );

        // Find the participant in the list
        let mut found = false;
        let mut updated_participants = Vec::new(&env);
        let mut share_amount: i128 = 0;

        for i in 0..session.participants.len() {
            let mut p = session.participants.get(i).unwrap();
            if p.address == participant {
                assert!(!p.has_paid, "participant already paid");
                p.has_paid = true;
                share_amount = p.share_amount;
                found = true;
            }
            updated_participants.push_back(p);
        }

        assert!(found, "participant not found in this bill");

        // Transfer tokens from participant to this contract
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&participant, &contract_address, &share_amount);

        // Update session state
        session.collected_amount += share_amount;
        session.participants = updated_participants;

        // Check if all participants have paid
        let all_paid = session
            .participants
            .iter()
            .all(|p| p.has_paid);

        if all_paid {
            session.status = BillStatus::Completed;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &session);
    }

    /// Allows the organizer to claim all collected funds after bill is Completed.
    ///
    /// # Arguments
    /// * `bill_id` - The ID of the split bill session
    pub fn claim_funds(env: Env, bill_id: u64) {
        let mut session: SplitBillSession = env
            .storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .expect("bill not found");

        assert!(
            session.status == BillStatus::Completed,
            "bill is not completed — not all participants have paid"
        );

        // Only the organizer can claim
        session.organizer.require_auth();

        // Transfer all collected funds to the organizer
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(
            &contract_address,
            &session.organizer,
            &session.collected_amount,
        );

        // Mark as claimed by zeroing out collected amount
        session.collected_amount = 0;

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &session);
    }

    /// Allows a participant to reclaim their share if the bill has expired.
    ///
    /// A bill is considered expired when the current ledger timestamp exceeds
    /// the deadline AND the bill is not yet completed.
    ///
    /// # Arguments
    /// * `bill_id` - The ID of the split bill session
    /// * `participant` - The address of the participant requesting a refund
    pub fn refund(env: Env, bill_id: u64, participant: Address) {
        participant.require_auth();

        let mut session: SplitBillSession = env
            .storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .expect("bill not found");

        // Check if deadline has passed
        let current_time = env.ledger().timestamp();
        assert!(
            current_time > session.deadline,
            "deadline has not passed yet"
        );
        assert!(
            session.status == BillStatus::Pending,
            "bill is not in pending status (already completed or expired)"
        );

        // Mark as expired on first refund
        session.status = BillStatus::Expired;

        // Find the participant and check they paid
        let mut refund_amount: i128 = 0;
        let mut updated_participants = Vec::new(&env);

        for i in 0..session.participants.len() {
            let mut p = session.participants.get(i).unwrap();
            if p.address == participant {
                assert!(p.has_paid, "participant has not paid — nothing to refund");
                refund_amount = p.share_amount;
                p.has_paid = false;
            }
            updated_participants.push_back(p);
        }

        assert!(refund_amount > 0, "participant not found or nothing to refund");

        // Transfer refund from contract back to participant
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &session.token);
        token_client.transfer(&contract_address, &participant, &refund_amount);

        // Update state
        session.collected_amount -= refund_amount;
        session.participants = updated_participants;

        env.storage()
            .persistent()
            .set(&DataKey::Bill(bill_id), &session);
    }

    /// Returns the full details of a split bill session.
    ///
    /// # Arguments
    /// * `bill_id` - The ID of the split bill session
    pub fn get_bill(env: Env, bill_id: u64) -> SplitBillSession {
        env.storage()
            .persistent()
            .get(&DataKey::Bill(bill_id))
            .expect("bill not found")
    }

    /// Returns the current bill counter (total bills created).
    pub fn get_bill_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::BillCounter)
            .unwrap_or(0)
    }
}

// ── Tests ────────────────────────────────────────────────────────────

#[cfg(test)]
mod test;
