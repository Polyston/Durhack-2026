use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
// Replace with the actual Playground program ID before deployment.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod deep_search {
    use super::*;
    pub fn create_search(ctx: Context<CreateSearch>, search_id: u64, drones: Vec<Pubkey>, bounty: u64) -> Result<()> {
        require!(!drones.is_empty() && drones.len() <= 8, SearchError::InvalidDrones);
        for (i, key) in drones.iter().enumerate() {
            require!(!drones[..i].contains(key), SearchError::InvalidDrones);
        }
        require!(bounty > 0, SearchError::InvalidBounty);
        let search = &mut ctx.accounts.search;
        search.authority = ctx.accounts.authority.key();
        search.drones = drones;
        search.bounty = bounty;
        search.found = false;
        search.finder = Pubkey::default();
        search.commits = 0;
        search.bump = ctx.bumps.search;
        search.search_id = search_id;
        transfer(CpiContext::new(ctx.accounts.system_program.to_account_info(), Transfer {
            from: ctx.accounts.authority.to_account_info(), to: search.to_account_info(),
        }), bounty)?;
        Ok(())
    }
    pub fn submit_coverage(ctx: Context<SubmitCoverage>, root: [u8;32], num_records: u32, tick: u64) -> Result<()> {
        require!(num_records > 0, SearchError::EmptyCommit);
        let search = &mut ctx.accounts.search;
        let commit = &mut ctx.accounts.commit;
        commit.search = search.key();
        commit.drone = ctx.accounts.drone.key();
        commit.root = root;
        commit.num_records = num_records;
        commit.tick = tick;
        search.commits = search.commits.checked_add(1).ok_or(SearchError::Overflow)?;
        emit!(CoverageSubmitted { search: search.key(), drone: commit.drone, root, num_records, tick });
        Ok(())
    }
    pub fn claim_bounty(ctx: Context<ClaimBounty>, cell: u32, tick: u64) -> Result<()> {
        let search = &mut ctx.accounts.search;
        require!(!search.found, SearchError::AlreadyFound);
        let amount = search.bounty;
        let info = search.to_account_info();
        let operator = ctx.accounts.operator.to_account_info();
        let remaining = info.lamports().checked_sub(amount).ok_or(SearchError::InsufficientFunds)?;
        require!(remaining >= Rent::get()?.minimum_balance(info.data_len()), SearchError::InsufficientFunds);
        let destination = operator.lamports().checked_add(amount).ok_or(SearchError::Overflow)?;
        **info.try_borrow_mut_lamports()? = remaining;
        **operator.try_borrow_mut_lamports()? = destination;
        search.found = true;
        search.finder = ctx.accounts.drone.key();
        search.bounty = 0;
        emit!(DetectionClaimed { search: search.key(), finder: search.finder, cell, tick, amount });
        Ok(())
    }
}
#[derive(Accounts)]
#[instruction(search_id: u64)]
pub struct CreateSearch<'info> {
    #[account(init, payer=authority, space=8+Search::SPACE, seeds=[b"search", authority.key().as_ref(), &search_id.to_le_bytes()], bump)]
    pub search: Account<'info, Search>,
    #[account(mut)] pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct SubmitCoverage<'info> {
    #[account(mut, seeds=[b"search", search.authority.as_ref(), &search.search_id.to_le_bytes()], bump=search.bump,
        constraint=search.drones.contains(&drone.key()) @ SearchError::UnregisteredDrone)]
    pub search: Account<'info, Search>,
    #[account(init, payer=operator, space=8+CoverageCommit::SPACE, seeds=[b"commit", search.key().as_ref(), &search.commits.to_le_bytes()], bump)]
    pub commit: Account<'info, CoverageCommit>,
    pub drone: Signer<'info>,
    #[account(mut, address=search.authority @ SearchError::WrongOperator)] pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ClaimBounty<'info> {
    #[account(mut, seeds=[b"search", search.authority.as_ref(), &search.search_id.to_le_bytes()], bump=search.bump,
        constraint=search.drones.contains(&drone.key()) @ SearchError::UnregisteredDrone)]
    pub search: Account<'info, Search>,
    pub drone: Signer<'info>,
    #[account(mut, address=search.authority @ SearchError::WrongOperator)] pub operator: Signer<'info>,
}
#[account]
pub struct Search {
    pub authority: Pubkey, pub drones: Vec<Pubkey>, pub bounty: u64,
    pub found: bool, pub finder: Pubkey, pub commits: u32, pub bump: u8,
    pub search_id: u64,
}
impl Search { pub const SPACE: usize = 32+4+8*32+8+1+32+4+1+8; }
#[account]
pub struct CoverageCommit { pub search: Pubkey, pub drone: Pubkey, pub root: [u8;32], pub num_records: u32, pub tick: u64 }
impl CoverageCommit { pub const SPACE: usize = 32+32+32+4+8; }
#[event]
pub struct CoverageSubmitted { pub search: Pubkey, pub drone: Pubkey, pub root: [u8;32], pub num_records: u32, pub tick: u64 }
#[event]
pub struct DetectionClaimed { pub search: Pubkey, pub finder: Pubkey, pub cell: u32, pub tick: u64, pub amount: u64 }
#[error_code]
pub enum SearchError {
    #[msg("Register one to eight unique drone keys")] InvalidDrones,
    #[msg("Bounty must be positive")] InvalidBounty,
    #[msg("Drone is not registered")] UnregisteredDrone,
    #[msg("Operator must be the search authority")] WrongOperator,
    #[msg("Coverage must contain records")] EmptyCommit,
    #[msg("Bounty already claimed")] AlreadyFound,
    #[msg("Arithmetic overflow")] Overflow,
    #[msg("Insufficient escrow funds")] InsufficientFunds,
}
