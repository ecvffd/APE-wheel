import { useState, useEffect, useCallback } from 'react';
import { Page } from '@/components/Page';
import { WheelComponent } from '@/components/Wheel/WheelComponent';
import { AnimatedBalance } from '@/components/AnimatedBalance/AnimatedBalance';
import { Text, Modal, Placeholder, Input } from '@telegram-apps/telegram-ui';
import './IndexPage.css';
import { publicUrl } from '@/helpers/publicUrl';
import { debounce } from '@/helpers/utils';
import { WheelPrize, UserBalances } from '@/types/common';
import { getWheelInfo, spinWheel, setWalletAddress as saveWalletAddress } from '@/services/wheelService';
import { initData, miniApp } from '@telegram-apps/sdk-react';
import { ModalHeader } from '@telegram-apps/telegram-ui/dist/components/Overlays/Modal/components/ModalHeader/ModalHeader';
import { ModalClose } from '@telegram-apps/telegram-ui/dist/components/Overlays/Modal/components/ModalClose/ModalClose';
import { Icon28Close } from '@telegram-apps/telegram-ui/dist/icons/28/close';

const coinsImage = publicUrl('prizes/coins.svg');
const zeroImage = publicUrl('prizes/zero.svg');
const coinsIcon = publicUrl('prizes/coins-icon.svg');

// Define the 12 sectors: 8 coins, 2 nft, 2 zero
const pinkCoinsSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'Coins', imageUrl: coinsImage, backgroundColor: '#FAB79C', borderColor: '#C27990'
}

const redCoinsSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'Coins', imageUrl: coinsImage, backgroundColor: '#B63013', borderColor: '#862011'
}

const nftSector: Omit<WheelPrize, 'id'> = {
    text: 'NFT', prizeName: 'NFT', backgroundColor: '#EEBC02', borderColor: '#DD8706', textColor: '#000000'
}

const zeroSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'Zero', imageUrl: zeroImage, backgroundColor: '#212121', borderColor: '#606060'
}

// 12 sectors: 8 coins, 2 zero, 2 nft
const wheelPrizes: WheelPrize[] = [
    { id: 1, ...pinkCoinsSector },
    { id: 2, ...nftSector },
    { id: 3, ...pinkCoinsSector },
    { id: 4, ...redCoinsSector },
    { id: 5, ...zeroSector },
    { id: 6, ...redCoinsSector },
    { id: 7, ...pinkCoinsSector },
    { id: 8, ...nftSector },
    { id: 9, ...pinkCoinsSector },
    { id: 10, ...redCoinsSector },
    { id: 11, ...zeroSector },
    { id: 12, ...redCoinsSector },
];

export function IndexPage() {
    const [lastPrize, setLastPrize] = useState<WheelPrize | null>(null);
    const [canSpin, setCanSpin] = useState<boolean>(true);
    const [timeUntilNextSpin, setTimeUntilNextSpin] = useState<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 });
    const [balances, setBalances] = useState<UserBalances>({ coins: 0, nft: 0 });
    const [isSpinning, setIsSpinning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedPrizeId, setSelectedPrizeId] = useState<number | undefined>(undefined);

    // Fetch wheel info on component mount
    useEffect(() => {
        fetchWheelInfo();

        miniApp.setBackgroundColor('#E0906B');
        miniApp.setHeaderColor('#E0906B');
    }, []);

    // Update countdown every minute
    useEffect(() => {
        if (!canSpin && timeUntilNextSpin.hours > 0 || timeUntilNextSpin.minutes > 0) {
            const interval = setInterval(() => {
                fetchWheelInfo(); // Refresh to get updated countdown
            }, 60000); // Update every minute

            return () => clearInterval(interval);
        }
    }, [canSpin, timeUntilNextSpin]);

    const fetchWheelInfo = async () => {
        try {
            const response = await getWheelInfo();
            if (response.ok) {
                setCanSpin(response.canSpin || false);
                setTimeUntilNextSpin(response.timeUntilNextSpin || { hours: 0, minutes: 0 });
                setBalances(response.balances || { coins: 0, nft: 0 });
                if (response.walletAddress) {
                    setWalletAddress(response.walletAddress);
                    setWalletConnected(true);
                }
            } else {
                setError(response.err || 'Failed to load wheel info');
            }
        } catch (err) {
            console.error('Error fetching wheel info:', err);
            setError('Failed to load wheel info');
        }
    };

    const [lastPrizeAmount, setLastPrizeAmount] = useState<number | null>(null);

    const handleSpinComplete = (prize: WheelPrize) => {
        setLastPrize(prize);
        setSelectedPrizeId(undefined); // Reset for next spin
        setIsSpinning(false);

        // Refresh wheel info to get updated balances and attempts
        setTimeout(() => {
            fetchWheelInfo();
        }, 1000);
    };

    const handleSpinClick = async () => {
        if (isSpinning || !canSpin) return;

        setIsSpinning(true);
        setError(null);
        setLastPrize(null);
        setLastPrizeAmount(null); // Reset prize amount for new spin

        try {
            const response = await spinWheel();

            if (response.ok && response.result) {
                setSelectedPrizeId(response.result);
                // setCanSpin(false); // User can't spin again until 24 hours
                // Store the prize amount if it's available in the response
                if (response.prizeAmount) {
                    setLastPrizeAmount(response.prizeAmount);
                }
            } else {
                setError(response.err || 'Spin failed');
                setIsSpinning(false);
            }
        } catch (err) {
            console.error('Error spinning wheel:', err);
            setError('Spin failed');
            setIsSpinning(false);
        }
    };

    const getPrizeName = (prize: WheelPrize) => {
        const baseName = prize.prizeName || prize.text || `Prize ${prize.id}`;

        // If it's a coins prize and we have the amount, show it
        if (baseName === 'Coins' && lastPrizeAmount) {
            return `${lastPrizeAmount} Coins`;
        }

        return baseName;
    };

    const [walletAddress, setWalletAddress] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);
    const [showWalletModal, setShowWalletModal] = useState(false);


    const handleWalletSave = async () => {
        if (!walletAddress.trim()) {
            setWalletError('Please enter a valid wallet address');
            return;
        }

        try {
            const response = await saveWalletAddress(walletAddress.trim());
            if (response.ok) {
                setWalletConnected(true);
                setWalletError(null);
                // Close modal or show success message
            } else {
                setWalletError(response.err || 'Failed to save wallet address');
            }
        } catch (err) {
            console.error('Error saving wallet address:', err);
            setWalletError('Failed to save wallet address');
        }
    };

    const debouncedHandleWalletSave = useCallback(debounce(handleWalletSave, 1000), [walletAddress]);

    const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSpinning) {
            setWalletError('Cannot change wallet address while spinning');
            return;
        }

        setWalletAddress(e.target.value);
        setWalletError(null);
    };

    const handleInputBlur = () => {
        if (walletAddress.length === 0) {
            return;
        } else if (walletAddress.length >= 32 && walletAddress.length <= 44) {
            debouncedHandleWalletSave();
        } else {
            setWalletError('Invalid Solana wallet address');
        }
    };

    return (
        <Page>
            <div className="index-page">
                <div className="header">
                    <img className="profile-image" src={initData.user()?.photo_url} alt="Profile" onClick={() => setShowWalletModal(true)} />


                    {/* Balances */}
                    <div className="balances-section">
                        <div className="balance-card" onClick={() => setShowWalletModal(true)}>
                            <img src={coinsIcon} style={{ width: '28px', height: '28px', userSelect: 'none', pointerEvents: 'none' }} alt="Coins" />
                            <AnimatedBalance value={balances.coins} />
                        </div>
                        <div className="balance-card" style={{ padding: '6px 10px' }} onClick={() => setShowWalletModal(true)}>
                            <Text weight="1" style={{ fontSize: '24px', lineHeight: '28px', color: '#fff', userSelect: 'none' }}>NFT</Text>
                            <AnimatedBalance value={balances.nft} marginBottom='0px' />
                        </div>
                    </div>
                </div>





                {/* Wheel */}
                <div className="wheel-container">
                    <WheelComponent
                        prizes={wheelPrizes}
                        selectedPrizeId={selectedPrizeId}
                        onSpinComplete={handleSpinComplete}
                        onSpinStart={handleSpinClick}
                        canvasWidth={368}
                        canvasHeight={368}
                        fontSize={16}
                        disabled={isSpinning || !canSpin}
                        centerText={canSpin || isSpinning ? 'SPIN' : `Next spin in ${timeUntilNextSpin.hours}h ${timeUntilNextSpin.minutes}m`}
                        centerTextFontSize={canSpin || isSpinning ? 40 : 20}
                    />
                </div>

                {/* Footer */}
                <div className="footer">
                    {/* Error display */}
                    {error && (
                        <div className="attempts-card">
                            <Text weight="1">Error: {error}</Text>
                        </div>
                    )}

                    {/* Result */}
                    {lastPrize && (
                        <div className="attempts-card">
                            <Text weight="1">You won: {getPrizeName(lastPrize)}</Text>
                        </div>
                    )}
                </div>

                <Modal
                    open={showWalletModal}
                    onOpenChange={(e) => setShowWalletModal(e)}
                    header={<ModalHeader after={<ModalClose><Icon28Close style={{ color: 'var(--tgui--plain_foreground)', cursor: 'pointer' }} /></ModalClose>}>Only iOS header</ModalHeader>}
                    className='modal-profile'
                >
                    <Placeholder
                        description={<Text weight="3" style={{ color: walletConnected ? 'white' : undefined, whiteSpace: 'pre-line' }}>{walletConnected ? "Wallet is connected" : "Wallet is not connected. \n Connect your wallet to receive rewards"}</Text>}
                        header={<>
                            {initData.user()?.first_name} {initData.user()?.last_name}
                            {
                                initData.user()?.username && (
                                    <>
                                        <br />
                                        @{initData.user()?.username}
                                    </>
                                )
                            }
                        </>}
                        action={<div className='input-container'>
                            <Input autoFocus={!walletConnected} placeholder="Solana wallet address" value={walletAddress} onChange={handleWalletChange} onBlur={handleInputBlur} className='input' />
                            {walletError && <Text weight="3" style={{ color: 'var(--tgui--error_foreground)' }}>{walletError}</Text>}
                        </div>}
                    >
                        <img
                            alt="Profile image"
                            src={initData.user()?.photo_url}
                            style={{
                                display: 'block',
                                height: '144px',
                                width: '144px',
                                borderRadius: '50%'
                            }}
                        />
                    </Placeholder>
                </Modal>
            </div>
        </Page>
    );
} 