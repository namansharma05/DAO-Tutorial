import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Web3Modal from 'web3modal';
import {providers, Contract} from 'ethers';
import {formatEther} from 'ethers/lib/utils'
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const web3ModalRef = useRef();
  const [isOwner, setIsOwner] = useState(false);
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [nftBalance, setNftBalance] = useState("0");
  const [numProposals, setNumProposals] = useState("0");
  const [selectedTab, setSelectedTab] = useState("");
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");

  const getDAOOwner = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const contract = await getDaoContractInstance(signer);
      const _owner = await contract.owner();

      const address = await signer.getAddress();
      if(address.toLowerCase() === _owner.toLowerCase()){
        setIsOwner(true);
      }
    } catch(err){
      console.error(err);
    }
  }

  const getDaoContractInstance = async(providerOrSigner) =>{
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner,
    );
  }
  
  const getDAOTreasuryBalance = async() =>{
    try{
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS
      );
      setTreasuryBalance(balance.toString());
    } catch(err){
      console.error(err);
    }
  }

  const getCryptodevsNFTContractInstance = async(providerOrSigner)=>{
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    );
  }

  const getUserNFTBalance = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const nftContract = await getCryptodevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNftBalance(parseInt(balance.toString()));
    } catch(err){
      console.error(err);
    }
  }

  const getNumProposalsInDAO = async()=>{
    try{
      const provider = await getProviderOrSigner();
      const contract = await getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch(err){
      console.error(err);
    }
  }

  const connectWallet = async()=>{
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err){
      console.error(err);
    }
  }

  const getProviderOrSigner = async(needSigner = false)=>{
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const {chainId} = await web3Provider.getNetwork();
    if(chainId !== 5){
      window.alert("connect to the Goerli network!");
      throw new Error("connect to the Goerli network!");
    }
    if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }

  const fetchProposalById = async(id)=>{
    try{
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proosalId: id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString())*1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch(err){
      console.error(err);
    }
  }

  const fetchAllProposals = async()=>{
    try{
      const proposals = [];
      for(let i=0;i<numProposals;i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }
      setProposals(proposals);
      return proposals;
    } catch(err){
      console.error(err);
    }
  }

  const createProposal = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = await getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch(err){
      console.error(err);
      window.alert(err.reason);
    }
  }

  const voteOnProposal = async(proposalId,_vote)=>{
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = await getDaoContractInstance(signer);

      let vote = _vote === "YAY" ? 0 : 1;
      const txn = await daoContract.voteOnProposal(proposalId,vote);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch(err){
      console.error(err);
      window.alert(err.reason);
    }
  }

  const withdrawDAOEther = async()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const contract = await getDaoContractInstance(signer);

      const txn = await contract.withdrawEther();
      setLoading(true);
      await txn.wait();
      setLoading(false);
      getDAOTreasuryBalance();
    } catch(err){
      console.error(err);
    }
  }

  const executeProposal = async(proposalId)=>{
    try{
      const signer = await getProviderOrSigner(true);
      const daoContract = await getDaoContractInstance(signer);
      const txn = daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
      getDAOTreasuryBalance();
    } catch(err){
      console.error(err);
      window.alert(err.reason);
    }
  }

  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network : "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet().then(()=>{
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
        getDAOOwner();
      });
    }
  },[walletConnected]);

  useEffect(()=>{
    if(selectedTab === "View Proposals"){
      fetchAllProposals();
    }
  },[selectedTab])

  function renderTabs(){
    if(selectedTab === "Create Proposal"){
      return renderCreateProposalTab();
    } else if(selectedTab === "View Proposal"){
      return renderViewProposalTab();
    }
    return null;
  }

  function renderCreateProposalTab(){
    if(loading){
      return(
        <div className={styles.description}>
          Loading... Waiting for transactions...
        </div>
      );
    } else if(nftBalance === 0) {
      return (
        <div className={styles.description}>
          You do not own any CryptoDevs NFTs. <br/>
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    } else {
      return (
        <div className={styles.description}>
          <label>Fake NFT Token ID to Purchase:</label>
          <input 
            placeholder="0"
            type="number"
            onChange={(e)=>setFakeNftTokenId(e.target.value)}
          />
          <button className={styles.button2} onClick={createProposal}>Create</button>
        </div>
      )
    }
  }

  function renderViewProposalTab(){
    console.log("in render view function")
    if(loading){
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if(proposals.length === 0){
      return(
        <div className={styles.description}>No proposals have been created</div>
      );
    } else {
      return (
        <div>
          {proposals.map((p,index)=>(
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2} onClick={()=> voteOnProposal(p.proposalId,"YAY")}>Vote YAY</button>
                  <button className={styles.button2} onClick={()=> voteOnProposal(p.proposalId,"NAY")}>Vote NAY</button>
                </div>
              ): p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button className={styles.button2} onclick={()=> executeProposal(p.proosalId)}>Execute Proposal {p.yayVotes > p.nayVotes ? "(YAY)" : "(NAY)"}</button>
                </div>
              ):(
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        </div>
      );
    }
  }


  return (
    <div>
      <Head>
        <title>Crypto Devs DAO</title>
        <meta name="description" content="CryptoDevs DAO"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>Welcom to the DAO!</div>
          <div className={styles.description}>
            Your CryptoDevs NFT Balance : {nftBalance}
            <br/>
            Treasury Balance : {formatEther(treasuryBalance)} ETH
            <br/>
            Totla number of Proposals : {numProposals}
          </div>
          <div className={styles.flex}>
            <button className={styles.button} onClick={()=>setSelectedTab("Create Proposal")}>Create Proposal</button>
            <button className={styles.button} onClick={()=>setSelectedTab("View Proposal")}>View Proposals</button>
          </div>
          {renderTabs()}
          {isOwner ? (
            <div>
              {loading ? <button className={styles.button}>Loading...</button> : <button className={styles.button} onClick={withdrawDAOEther}>Withdraw DAO ETH</button>}
            </div>
          ):(
            ""
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg"/>
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Naman
      </footer>
    </div>
  );
}
