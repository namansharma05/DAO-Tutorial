//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FakeNFTMarketplace {
    //maps the tokenids to the owners(addresses)
    mapping(uint256 => address) public tokens;
    uint256 nftPrice = 0.001 ether;

    //purchase function which takes some ETH, and mark the msg.sender address 
    //as the owner of some NFT
    function purchase(uint256 _tokenId) external payable{
        require(msg.value == nftPrice, "Not enough ether");
        require(tokens[_tokenId] == address(0),"not for sale");
        tokens[_tokenId] = msg.sender;
    }

    // returns the price of the nft
    function getPrice() external view returns(uint256){
        return nftPrice;
    }

    // is this nft for sale
    function available(uint256 _tokenId) external view returns(bool){
        if(tokens[_tokenId] == address(0)){
            return true;
        }
        return false;
    }
}