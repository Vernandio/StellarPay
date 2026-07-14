#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Env, Vec,
};

/// Helper: register a mock USDC token and mint to participants
fn setup_token(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract(admin.clone())
}

fn mint_token(env: &Env, token_addr: &Address, admin: &Address, to: &Address, amount: i128) {
    let admin_client = token::StellarAssetClient::new(env, token_addr);
    admin_client.mint(to, &amount);
}

fn get_balance(env: &Env, token_addr: &Address, addr: &Address) -> i128 {
    let client = token::Client::new(env, token_addr);
    client.balance(addr)
}

#[test]
fn test_create_bill() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let participants = Vec::from_array(&env, [alice.clone(), bob.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128, 2000_i128]);
    let deadline = 1000u64;

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &deadline);

    assert_eq!(bill_id, 1);

    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.target_amount, 3000);
    assert_eq!(bill.collected_amount, 0);
    assert_eq!(bill.status, BillStatus::Pending);
    assert_eq!(bill.participants.len(), 2);
}

#[test]
fn test_pay_share_and_complete() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Mint tokens to participants
    mint_token(&env, &token_addr, &token_admin, &alice, 5000);
    mint_token(&env, &token_addr, &token_admin, &bob, 5000);

    let participants = Vec::from_array(&env, [alice.clone(), bob.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128, 2000_i128]);
    let deadline = 1000u64;

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &deadline);

    // Alice pays her share
    client.pay_share(&bill_id, &alice);
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.collected_amount, 1000);
    assert_eq!(bill.status, BillStatus::Pending);
    assert_eq!(get_balance(&env, &token_addr, &alice), 4000);

    // Bob pays his share — should auto-complete
    client.pay_share(&bill_id, &bob);
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.collected_amount, 3000);
    assert_eq!(bill.status, BillStatus::Completed);
    assert_eq!(get_balance(&env, &token_addr, &bob), 3000);
}

#[test]
fn test_claim_funds() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);

    mint_token(&env, &token_addr, &token_admin, &alice, 5000);

    let participants = Vec::from_array(&env, [alice.clone()]);
    let amounts = Vec::from_array(&env, [1500_i128]);

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &1000u64);

    // Alice pays
    client.pay_share(&bill_id, &alice);

    // Organizer claims
    let organizer_balance_before = get_balance(&env, &token_addr, &organizer);
    client.claim_funds(&bill_id);
    let organizer_balance_after = get_balance(&env, &token_addr, &organizer);

    assert_eq!(organizer_balance_after - organizer_balance_before, 1500);
}

#[test]
#[should_panic(expected = "bill is not completed")]
fn test_claim_before_complete_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);

    let participants = Vec::from_array(&env, [alice.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128]);

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &1000u64);

    // Try to claim without Alice paying — should panic
    client.claim_funds(&bill_id);
}

#[test]
#[should_panic(expected = "participant already paid")]
fn test_double_pay_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);
    mint_token(&env, &token_addr, &token_admin, &alice, 5000);

    let participants = Vec::from_array(&env, [alice.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128]);

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &1000u64);

    client.pay_share(&bill_id, &alice);
    // Pay again — should panic
    client.pay_share(&bill_id, &alice);
}

#[test]
fn test_refund_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    mint_token(&env, &token_addr, &token_admin, &alice, 5000);
    mint_token(&env, &token_addr, &token_admin, &bob, 5000);

    let participants = Vec::from_array(&env, [alice.clone(), bob.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128, 2000_i128]);
    let deadline = 500u64;

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &deadline);

    // Alice pays, Bob doesn't
    client.pay_share(&bill_id, &alice);
    assert_eq!(get_balance(&env, &token_addr, &alice), 4000);

    // Fast-forward past deadline
    env.ledger().set(LedgerInfo {
        timestamp: 600,
        protocol_version: 22,
        sequence_number: 100,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3110400,
    });

    // Alice requests refund
    client.refund(&bill_id, &alice);

    // Alice should have her tokens back
    assert_eq!(get_balance(&env, &token_addr, &alice), 5000);

    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Expired);
    assert_eq!(bill.collected_amount, 0);
}

#[test]
#[should_panic(expected = "deadline has not passed yet")]
fn test_refund_before_deadline_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);

    let alice = Address::generate(&env);
    mint_token(&env, &token_addr, &token_admin, &alice, 5000);

    let participants = Vec::from_array(&env, [alice.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128]);
    let deadline = 999u64;

    let bill_id = client.create_bill(&organizer, &token_addr, &participants, &amounts, &deadline);

    client.pay_share(&bill_id, &alice);

    // Ledger timestamp is 0 by default — before deadline
    // This should fail
    client.refund(&bill_id, &alice);
}

#[test]
fn test_multiple_bills() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SplitBillManager);
    let client = SplitBillManagerClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_addr = setup_token(&env, &token_admin);
    let alice = Address::generate(&env);

    let participants = Vec::from_array(&env, [alice.clone()]);
    let amounts = Vec::from_array(&env, [1000_i128]);

    let bill_1 = client.create_bill(&organizer, &token_addr, &participants, &amounts, &1000u64);
    let bill_2 = client.create_bill(&organizer, &token_addr, &participants, &amounts, &2000u64);

    assert_eq!(bill_1, 1);
    assert_eq!(bill_2, 2);
    assert_eq!(client.get_bill_count(), 2);
}
