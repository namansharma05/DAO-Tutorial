//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketplace {
    function purchase(uint256 _tokenId) external payable;
    function getPrice() external view returns(uint256);
    function available(uint256 _tokenId) external view returns(bool);
}

interface ICryptoDevsNFT {
    function balanceOf(address owner) external view returns(uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns(uint256);
}

contract CryptoDevsDAO is Ownable{

    enum Vote{
        YAY,
        NAY
    }

    struct Proposal {
        uint256 nftTokenId;
        //when does voting ends
        uint256 deadline;
        uint256 yayVotes;
        uint256 nayVotes;

        bool executed;

        mapping(uint256 => bool) voters;
    }
    mapping(uint256 => Proposal) public proposals;
    uint256 public numProposals;

    IFakeNFTMarketplace nftMarketplace;
    ICryptoDevsNFT cryptoDevsNFT;

    constructor(address _nftMarketplace, address _cryptoDevsNFT) payable {
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
    }

    modifier nftHolderOnly(){
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0,"Not a DAO member");
        _;
    }

    modifier activeProposalOnly(uint256 proposalId){
        require(proposals[proposalId].deadline > block.timestamp,"proposal inactive");
        _;
    }

    modifier inactiveProposalOnly(uint256 proposalId){
        require(proposals[proposalId].deadline <= block.timestamp,"proposal active");
        require(proposals[proposalId].executed == false,"already executed");
        _;
    }

    //create a proposal 
    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns(uint256){
        require(nftMarketplace.available(_nftTokenId),"nft not for sale");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;
        
        return numProposals-1;
    }

    //vote on the proposal 
    function voteOnProposal(uint256 proposalId,Vote vote) external nftHolderOnly activeProposalOnly(proposalId) {
        Proposal storage proposal = proposals[proposalId];

        uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);

        uint256 numVotes;
        for(uint256 i=0;i<voterNFTBalance;++i){
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if(proposal.voters[tokenId]== false){
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }
        require(numVotes > 0,"already voted");
        if(vote == Vote.YAY){
            proposal.yayVotes+=numVotes;
        } else {
            proposal.nayVotes+=numVotes;
        }
    }

    //execute the proposal 
    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];
        if(proposal.yayVotes > proposal.nayVotes) {
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "not enough founds");
            nftMarketplace.purchase{value:nftPrice}(proposal.nftTokenId); 
        }
        proposal.executed = true;
    }

    //withdraw ether
    function withdrawEther() external onlyOwner{
        uint256 amount = address(this).balance;
        require(amount > 0,"nothing to withdraw contract balance empty");
        payable(owner()).transfer(amount);
    }

    receive() external payable{}
    fallback() external payable{}
}