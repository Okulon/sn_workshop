'use client';
import React, { FC, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { useBlockNumber, useAccount, useBalance, useSendTransaction, useTransactionReceipt, useContract, useReadContract, useNetwork, useBlock } from "@starknet-react/core";
import { BlockNumber, RpcProvider } from 'starknet';
import { ABI } from "../abis/abi";
import { type Abi } from "starknet";

const WalletBar = dynamic(() => import('../components/WalletBar'), { ssr: false })
const Page: FC = () => {

  // Step 1 --> Read the latest block -- Start
  const { data: blocknumberData, error:blocknumberError, isLoading: blocknumberIsLoading, isError: blocknumberIsError } = useBlockNumber({blockIdentifier: "latest" as BlockNumber});
  const workshopEnd = 450000;
  // Step 1 --> Read the latest block -- End

  // Step 2 --> Read your balance -- Start
  const {address: userAddress } = useAccount();
  const {isLoading: balanceIsLoading, isError: balanceIsError, error: isError, data: balanceData} = useBalance({
    address: userAddress,
    watch: true,
    refetchInterval: 1000
  });
  // Step 2 --> Read your balance -- End

  // Step 3 --> Read counter from contract -- Start
  const { chain } = useNetwork();

  const contractAddress = "0x07de06e0b46751e0361993838c4741c162dc5f7ebe50dcaf9863f94bc93573f7";
  const { data: readData, error: readError, isLoading: readIsLoading, isError:readIsError, refetch: dataRefetch } = useReadContract({
    functionName: "get_counter",
    args: [],
    abi: ABI as Abi,
    address: contractAddress,
    watch: true,
  });  
  // Step 3 --> Read counter from contract -- End

  // Step 4 --> Increase counter on contract -- Start
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await writeAsync();
  }
  const typedABI = ABI as Abi;
  const {contract } = useContract({
    abi: typedABI,
    address: contractAddress
  });
  const calls = useMemo(() => {
    if(!userAddress || !contract) return [];
    return [contract.populate("increase_counter")]; 
  }, [userAddress, contract]);

  const {send: writeAsync, data: writeData, isPending:writeIsPending } = useSendTransaction({
    calls
  });

  const {data: waitData, status: waitStatus, isLoading: waitIsLoading, isError: waitIsError, error: waitError } = useTransactionReceipt( {
    watch: true,
    hash: writeData?.transaction_hash
  });
  
  const LoadingState = ({ message } : { message: string }) => (
    <div className="flex items-center space-x-2">
      <div className='animate-spin'>
        <svg className = "h-5 w5 text-gray-800" xmlns="http://www.w3.org/2000/vg" fill = "none" viewBox=" 0 0 24" stroke ="currentColor">
          <path strokeLinecap='round' strokeLinejoin="round" strokeWidth ={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <span>{message}</span>
    </div>
  );

  const buttonContent = () => {
    if (writeIsPending) {
      return <LoadingState message="Send.." />;
    }
    
    if (waitIsLoading) {
      return <LoadingState message="Waiting for confirmation.." />;
    }

    if (waitStatus == "error") {
      return <LoadingState message="Transaction rejected-..," />;
    }

    if (waitStatus == "success") {
      return "Transaction Confirmed";
    }

    return "Send";
  };
  // Step 4 --> Increase counter on contract -- End

  // Step 5 --> Reset balance -- Start
  // Step 5 --> Reset balance -- End

  // Step 6 --> Get events from a contract -- Start
  type ContractEvent = {
    from_address: string;
    keys: string[];
    data: string[];
  }
  const provider = useMemo(() => new RpcProvider({
    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL
  }), []);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const lastCheckedBlockRef = useRef(0);
  const {data: blockNumber } = useBlockNumber({refetchInterval: 1000});
  const checkForEvents = useCallback(async(contract: any, currentBlockNumber: number) =>{
    if (currentBlockNumber <= lastCheckedBlockRef.current) return;
    try {
      const fromBlock = lastCheckedBlockRef.current +1;
      const fetchedEvents = await provider.getEvents({
        address: contract.address,
        from_block: {block_number: fromBlock},
        to_block: { block_number: currentBlockNumber},
        chunk_size: 500,
      });

      if (fetchedEvents && fetchedEvents.events) {
        setEvents(prevEvents => [ ...prevEvents, ...fetchedEvents.events]);
      }

    } catch (error) {
      console.log("Error checking for events:", error);
    }
  }, [provider]);
  useEffect(() => {
    if (contract && blockNumber) {
      checkForEvents(contract,blockNumber);
    }
  }, [contract, blockNumber, checkForEvents]);
  const lastFiveEvents = useMemo(() => {
    return [...events].reverse().slice(0,5);
  }, [events]);
  // Step 6 --> Get events from a contract -- End

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col">
      <h1 className="text-3xl font-bold text-center mb-6">Starknet Frontend Workshop</h1>

      <div className="flex flex-wrap justify-center gap-4">

        <div className="w-full max-w-md space-y-4">
          <div className="bg-black p-4 border-black border">
            <h2 className="text-xl font-bold mb-2">Wallet Connection</h2>
            <WalletBar />
          </div>

          {!blocknumberIsError && !blocknumberIsError && (
           <div className="bg-black p-4 border-black border">
            <h3 className="text-lg font-bold mb-2">Read the Blockchain</h3>
            <p>Current Block: {blocknumberData}</p>
            <p>{blocknumberData! < workshopEnd ? "Still Running" : "Ended"}</p>
          </div> )}

          { <div className="p-4 bg-black border-black border">
            <h3 className="text-lg font-bold mb-2">Your Balance</h3>
            <p>Symbol: {balanceData?.symbol}</p>
            <p>Balance: {Number(balanceData?.formatted).toFixed(2)}</p>
          </div> }

          { <div className="p-4 bg-black border-black border">
            <h3 className="text-lg font-bold mb-2">Reset Balance</h3>
            <button
              onClick={() => console.log("Resetting...")}
              disabled={false}
              className="mt-2 border border-black text-black font-regular py-2 px-4 bg-yellow-300 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Reset Balance
            </button>
            <p className="mt-2 text-sm">
              Transaction sent: url
            </p>
          </div> }

        </div>

        <div className="w-full max-w-md space-y-4">
          { <div className="p-4 bg-black border-black border">
            <h3 className="text-lg font-bold mb-2">Contract Balance</h3>
            <p>Balance: {readData?.toString()}</p> 
            <button
              onClick={() => dataRefetch()}
              className="mt-2 border border-black text-black font-regular py-1 px-3 bg-yellow-300 hover:bg-yellow-500"
            >
              Refresh
            </button>
          </div> }

          { <form onSubmit={handleSubmit} className="bg-black p-4 border-black border">
            <h3 className="text-lg font-bold mb-2">Increase Counter</h3>
            <button
              type="submit"
              className="mt-3 border border-black text-black font-regular py-2 px-4 bg-yellow-300 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={!userAddress || writeIsPending}
            >
              {buttonContent()}
            </button>
            {writeData?.transaction_hash && (
            <a
              href={`https://sepolia.voyager.online/tx/${writeData?.transaction_hash}`}
              target="_blank"
              className="block mt-2 text-blue-500 hover:text-blue-700 underline"
              rel="noreferrer"
            >
              Check TX on Sepolia
            </a>
            )}
          </form> }

          { <div className="bg-black p-4 border-black border">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-300 text-left p-2 font-semibold">#</th>
                  <th className="border-b border-gray-300 text-right p-2 font-semibold">New Balance</th>
                </tr>
              </thead>
              <tbody>
                {lastFiveEvents.map((event, index) => (
                <tr key={index} className={'bg-gray-50'}>
                  <td className="border-b border-gray-200 p-2">{lastFiveEvents.length-index}</td>
                  <td className="border-b border-gray-200 p-2 text-right">{event.data.length>0?event.data[0] : "initial Value"}</td>
                </tr>
                ))}
              </tbody>
            </table>
          </div> }

        </div>
      </div>
    </div >
  );
};

export default Page;