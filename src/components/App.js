import React, { useCallback, useEffect, useState, useReducer } from 'react';
import Web3 from 'web3';
import './App.css';
import { Spinner } from "react-bootstrap";
import RockPaperScissorsAbi from '../abi/contracts/Rps1.sol/Rps1.json';

import { providers, ethers } from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider'

function App() {
    const [loading, setLoading] = useState(true);
    const [rps, setRps] = useState();
    const [account, setAccount] = useState('');
    const [bet, setBet] = useState(0);
    const [betPaid, setBetPaid] = useState(0);
    const [password, setPassword] = useState('');
    const [hostMove, sethostMove] = useState(0);
    const [move, setMove] = useState(0);
    const [balance, setBalance] = useState(0);
    const [contract_address, setContractAddress] = useState('');

    const moveString = ["None", "Rock", "Paper", "Scissors"]

    const initialState  = {
        provider: null,
        web3Provider: null,
        address: null,
        chainId: null,
    }

    const resetStatus = () => {
        sethostMove(0)
        setMove(0)
        setBetPaid(0)
        rps.removeAllListeners("Won")
        rps.removeAllListeners("Lost")
        rps.removeAllListeners("Draw")
        rps.removeAllListeners("hostCommitedMove")
    }

    const reducer = (state, action) => {
        switch (action.type) {
            case 'SET_WEB3_PROVIDER':
                return {
                    ...state,
                    provider: action.provider,
                    web3Provider: action.web3Provider,
                    address: action.address,
                    chainId: action.chainId,
                }
            case 'SET_ADDRESS':
                return {
                    ...state,
                    address: action.address,
                }
            case 'SET_CHAIN_ID':
                return {
                    ...state,
                    chainId: action.chainId,
                }
            case 'RESET_WEB3_PROVIDER':
                return initialState
            default:
                return state
        }
    }

    const [state, dispatch] = useReducer(reducer, initialState)
    const { provider, web3Provider, address, chainId } = state
    const providerOptions = {
        // walletconnect: {
        //     package: WalletConnectProvider, // required
        //     options: {
        //       infuraId: "INFURA_ID", // required
        //     },
        // },
        //For metamask wallet
        injected: {
            display: {
                name: "MetaMask",
                description: "Connect with metamask from Browser",
            }
        }
    };
    const web3Modal = new Web3Modal(
        {
            network: 'sepolia',
            cacheProvider: true,
            providerOptions
        }
    );

    const connect = useCallback(
        async () => {
            const provider = await web3Modal.connect()

            const web3Provider = new providers.Web3Provider(provider)
            const signer = web3Provider.getSigner()
            const address = await signer.getAddress()

            const network = await web3Provider.getNetwork()

            dispatch({
                type: 'SET_WEB3_PROVIDER',
                provider,
                web3Provider,
                address,
                chainId: network.chainId,
            })

            //const contractAddress = "0xF2aAD54Faad2Eee83fB882C4A220AeAcA14899bC"
            //const contractAddress = "0x8f090ca90B7eDAe31815b74122cE0Cd5b23dB6d1"
            const contractAddress = "0x2dEA0668C4159ad35c050AD55803d2fc12069322"
            const rpsContract = new ethers.Contract(contractAddress, RockPaperScissorsAbi, signer)
            setRps(rpsContract)
            setContractAddress(contractAddress)
            const contractBalance = await web3Provider.getBalance(contractAddress);
            setBalance(contractBalance)
            setLoading(false)
        }, 
        []
    )

    const disconnect = useCallback(
        async () => {
            await web3Modal.clearCachedProvider()
            console.log(provider, provider.disconnect, provider && provider.disconnect && typeof provider.disconnect === 'function')
            if (provider && provider.disconnect && typeof provider.disconnect === 'function') {
                await provider.disconnect()
            }
            dispatch({
                type: 'RESET_WEB3_PROVIDER'
            })
        },
        [provider]
    )

    // Auto connect to the cached provider
    useEffect(() => {
        if (web3Modal.cachedProvider) {
            connect()
        }
    }, [connect])

    // A `provider` should come with EIP-1193 events. We'll listen for those events
    // here so that when a user switches accounts or networks, we can update the
    // local React state with that new information.
    useEffect(() => {
        if (provider && provider.on) {
            const handleAccountsChanged = (accounts) => {
                // eslint-disable-next-line no-console
                console.log('accountsChanged', accounts)
                dispatch({
                    type: 'SET_ADDRESS',
                    address: accounts[0]
                })
            }

            // https://docs.ethers.io/v5/concepts/best-practices/#best-practices--network-changes
            const handleChainChanged = (_hexChainId) => {
                window.location.reload()
            }

            const handleDisconnect = (error) => {
                // eslint-disable-next-line no-console
                console.log('disconnect', error)
                disconnect()
            }

            provider.on('accountsChanged', handleAccountsChanged)
            provider.on('chainChanged', handleChainChanged)
            provider.on('disconnect', handleDisconnect)

            // Subscription Cleanup
            return () => {
                if (provider.removeListener) {
                    provider.removeListener('accountsChanged', handleAccountsChanged)
                    provider.removeListener('chainChanged', handleChainChanged)
                    provider.removeListener('disconnect', handleDisconnect)
                }
            }
        }
    }, [provider, disconnect])

    useEffect(() => {
        if (!window.ethereum) {
            window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
            return
        }
    }, [])

    const updateState = async () => {
        const balance = await web3Provider.getBalance(contract_address)
        setBalance(balance)
        const bet = await rps.bet()
        setBetPaid(bet)
    }

    const reveal = (clearMove) => {
        setLoading(true)
        console.log("clear move", clearMove)
        rps.reveal(clearMove)
        .then((receipt) => {
            console.log('receipt', receipt)
            rps.on("Won", (data, event) => {
                updateState()
                setLoading(false)
                alert("You won!")
                resetStatus()
            })
            rps.on("Draw", (data, event) => {
                updateState()
                setLoading(false)
                alert("Draw!")
                resetStatus()
            })
            rps.on("Lost", (data, event) => {
                updateState()
                setLoading(false)
                alert("You Lost!")
                resetStatus()
            })
        });
    }

    const createGame = (bet) => {
        setLoading(true)
        console.log(account, contract_address, window.web3.utils.toWei(bet.toString(), 'ether'));
        rps.methods.createGame(contract_address).send({ from: account, value: window.web3.utils.toWei(bet.toString(), 'ether')})
        .once('receipt', async (receipt) => {
            setLoading(false)
            console.log(rps.events.GameCreated.returnValues);
            updateState();
        })
        .on('error', err => {
            console.error(err);
        })
        .then((receipt) => {
            console.log('receipt', receipt.events)
        });
    }

    const playBet = (move, password, bet) => {
        setLoading(true)
        const encryptedMove = ethers.utils.soliditySha256(['string'], [move + "-" + password])
        console.log(move, password, bet)
        setMove(move)
        rps.playBet(encryptedMove, {value: ethers.utils.parseEther(bet)})
        .then((receipt) => {
            console.log("played bet")
            console.log('receipt', receipt)
            rps.on("hostCommitedMove", (move, event) => {
                console.log("event", event)
                console.log("Host's move is", move);
                sethostMove(move)
                updateState()
                setLoading(false)
            })
        });
    }

    return (
        <div className="main-container" >
            <link
                rel="stylesheet"
                href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"
                integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T"
                crossOrigin="anonymous"
            />


            <div id="title">
                Rock Paper Scissors
            </div>

            <div id="data">
                {web3Provider ? (
                    // <button className="rpsButton" type="button" onClick={disconnect}>
                    //     Disconnect
                    // </button>
                    <>
                        <div>
                            Connected Wallet address: {address}
                        </div>
                        <div>
                            Chain ID: {chainId}
                        </div>
                    </>
                ) : (
                    <button className="rpsButton" type="button" onClick={connect}>
                        Connect Wallet
                    </button>
                )}
                <p>
                    Host Balance: {web3Provider ? ethers.utils.formatUnits(balance.toString(), 'ether') : 'Loading...'} ETH
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    Bet: {web3Provider ? ethers.utils.formatUnits(betPaid.toString(), 'ether') : 'Loading...'} ETH<br/>
                </p>
            </div>
            <div>
                {(() => {
                    if (loading) {
                        return <Spinner animation="border" variant="primary" size="sm" />
                    }
                })()}
            </div>
            <div>
                <h2>Take a Bet</h2>
                <div className="pure-form pure-form-aligned">
                    <fieldset>
                        <div className="pure-control-group">
                            <label htmlFor="bet">Bet Amount  :</label>
                            <input id="bet" type="text" placeholder="Bet amount in ETH"
                                onChange={(e) => {setBet(e.target.value)}}
                            />
                        </div>
                        <div className="pure-control-group">
                            <label htmlFor="password">Password  :</label>
                            <input id="password" type="text" placeholder="Password to reveal"
                                onChange={(e) => {setPassword(e.target.value)}}
                            />
                        </div>
                        {hostMove > 0 ?
                            (
                                <div className="pure-controls">
                                    <h2 id="choose">Host's move: {moveString[hostMove]}</h2>
                                    <button className="rpsButton"
                                    onClick={() => { reveal(move + '-' + password) }}>Reveal</button>
                                </div>
                            ):
                            (<></>)
                        }
                    </fieldset>
                </div>
            </div>
            {betPaid <= 0 ? 
                (
                    <div>
                        <h2 id="choose">Choose your hand</h2>
                        <ul>
                            <button className="rpsButton" onClick={() => { playBet(1, password, bet); }}>Rock</button>
                            <button className="rpsButton" onClick={() => { playBet(2, password, bet); }}>Paper</button>
                            <button className="rpsButton" onClick={() => { playBet(3, password, bet); }}>Scissors</button>
                        </ul>
                    </div>
                ):
                (<></>)
            }
        </div>
    )
}

export default App;