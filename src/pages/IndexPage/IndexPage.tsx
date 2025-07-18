import { useState, useEffect, useCallback } from 'react';
import { Page } from '@/components/Page';
import { WheelComponent } from '@/components/Wheel/WheelComponent';
import { AnimatedBalance } from '@/components/AnimatedBalance/AnimatedBalance';
import { Text, Modal, Placeholder, Input, Button } from '@telegram-apps/telegram-ui';
import { retrieveLaunchParams, shareURL } from '@telegram-apps/sdk-react';
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
const nftIcon = publicUrl('prizes/nft.png');


// Define the 12 sectors: 8 coins, 2 nft, 2 zero
const pinkCoinsSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'Coins', imageUrl: coinsImage, backgroundColor: '#FAB79C', borderColor: '#C27990'
}

const redCoinsSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'Coins', imageUrl: coinsImage, backgroundColor: '#B63013', borderColor: '#862011'
}

const nftSector: Omit<WheelPrize, 'id'> = {
    prizeName: 'NFT', imageUrl: nftIcon, imageWidth: 44, imageHeight: 32, backgroundColor: '#EEBC02', borderColor: '#DD8706', textColor: '#000000'
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
    const [referralSpins, setReferralSpins] = useState<number>(0);
    const [invitedUsersCount, setInvitedUsersCount] = useState<number>(0);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [selectedPrizeId, setSelectedPrizeId] = useState<number | undefined>(undefined);

    // Get referral code from Telegram WebApp start parameter and fetch wheel info on component mount
    useEffect(() => {
        const launchParams = retrieveLaunchParams();

        let refCode = launchParams.tgWebAppStartParam;

        fetchWheelInfo(refCode);

        miniApp.setBackgroundColor('#F6DAB2');
        miniApp.setHeaderColor('#E0906B');
    }, []);

    // Update countdown every minute
    useEffect(() => {
        if (!canSpin && timeUntilNextSpin.hours > 0 || timeUntilNextSpin.minutes > 0) {
            const interval = setInterval(() => {
                fetchWheelInfo(); // Refresh to get updated countdown (referral code not needed for updates)
            }, 60000); // Update every minute

            return () => clearInterval(interval);
        }
    }, [canSpin, timeUntilNextSpin]);

    const fetchWheelInfo = async (referralCode?: string) => {
        try {
            const response = await getWheelInfo(referralCode);

            if (response.ok) {
                setCanSpin(response.canSpin || false);
                setTimeUntilNextSpin(response.timeUntilNextSpin || { hours: 0, minutes: 0 });
                setBalances(response.balances || { coins: 0, nft: 0 });
                setReferralSpins(response.referralSpins || 0);
                setInvitedUsersCount(response.invitedUsersCount || 0);

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

    const handleInviteFriends = () => {
        setShowInviteModal(true);
    };

    const handleInviteShare = async () => {
        try {
            // Get user's referral code from the API response
            const response = await getWheelInfo();
            if (response.ok && response.referralCode) {
                // Get bot configuration from API response
                const botUsername = response.botConfig?.botUsername;

                if (!botUsername) {
                    console.error('Bot configuration missing:', response.botConfig);
                    alert('Bot configuration error. Please contact support.');
                    return;
                }

                const referralLink = `https://t.me/${botUsername}?startapp=${response.referralCode}`;
                const inviteText = `
🎰 Join me in MEME SEASON PASS WHEEL! 
🎁 You and I will get a bonus spin when you join

Try your luck and win coins and NFTs!`;

                shareURL(referralLink, inviteText);

                setShowInviteModal(false);
            } else {
                alert('Unable to get your referral link. Please try again.');
            }
        } catch (error) {
            console.error('Error sharing invitation:', error);
            alert('Error sharing invitation. Please try again.');
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
        setReferralSpins(prev => prev - 1);

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
        <Page back={false}>
            <div className="index-page">
                <div className="bg-container">
                    <img src={publicUrl('header-bg.png')} alt="Header background" />
                    <img style={{ padding: '0 32px', marginTop: '-24px' }} src={publicUrl('logo.png')} alt="Logo" />
                </div>

                <div className="header">
                    <img className="profile-image" src={initData.user()?.photo_url} alt="Profile" onClick={() => setShowWalletModal(true)} />


                    {/* Balances */}
                    <div className="balances-section">
                        {balances.nft > 0 && (
                            <div className="balance-card" style={{ padding: '2px 10px 2px 6px' }} onClick={() => setShowWalletModal(true)}>
                                <img src={nftIcon} style={{ width: '38px', height: '28px', userSelect: 'none', pointerEvents: 'none' }} alt="NFT" />
                                <AnimatedBalance value={balances.nft} />
                            </div>
                        )}
                        <div className="balance-card" onClick={() => setShowWalletModal(true)}>
                            <img src={coinsIcon} style={{ width: '28px', height: '28px', userSelect: 'none', pointerEvents: 'none' }} alt="Coins" />
                            <AnimatedBalance value={balances.coins} />
                        </div>
                        <button className="balance-card" style={{ padding: '2px 6px 2px 6px' }} onClick={handleInviteFriends}>
                            <img src={publicUrl('invite.svg')} style={{ width: '28px', height: '28px', padding: '4px', userSelect: 'none', pointerEvents: 'none' }} alt="Coins" />
                        </button>
                    </div>
                </div>





                {/* Wheel */}
                <div className="wheel-container">
                    <WheelComponent
                        prizes={wheelPrizes}
                        selectedPrizeId={selectedPrizeId}
                        onSpinComplete={handleSpinComplete}
                        onSpinStart={handleSpinClick}
                        canvasWidth={400}
                        canvasHeight={400}
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

                    {referralSpins > 0 && (
                        <div className="attempts-card">
                            <Text weight="1">You have {referralSpins} invite bonus spin{referralSpins > 1 ? 's' : ''}</Text>
                        </div>
                    )}
                </div>

                <Modal
                    open={showWalletModal}
                    onOpenChange={(e) => setShowWalletModal(e)}
                    header={<ModalHeader className="modal-header" after={<ModalClose><Icon28Close style={{ color: 'var(--tgui--plain_foreground)', cursor: 'pointer' }} /></ModalClose>}></ModalHeader>}
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

                <Modal
                    open={showInviteModal}
                    onOpenChange={(e) => setShowInviteModal(e)}
                    header={<ModalHeader className="modal-header" after={<ModalClose><Icon28Close style={{ color: 'var(--tgui--plain_foreground)', cursor: 'pointer' }} /></ModalClose>}></ModalHeader>}
                    className='modal-profile'
                >
                    <Placeholder
                        description={<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Text weight="3" style={{ whiteSpace: 'pre-line' }}>
                                {`Get a free spin for each friend you invite!\nYour friends also get a bonus spin when they join.`}
                            </Text>
                            {invitedUsersCount > 0 && <Text weight="2" style={{ whiteSpace: 'pre-line' }}>
                                {`Friends invited: ${invitedUsersCount}`}
                            </Text>}
                        </div>

                        }
                        header="Invite Friends"
                        action={
                            <Button
                                size="l"
                                onClick={handleInviteShare}
                                style={{ marginTop: '16px' }}
                            >
                                Invite Friends
                            </Button>
                        }
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', }}>
                            <img
                                alt="Season Pass"
                                src={nftIcon} // Temporary image, you can change this later
                                style={{
                                    display: 'block',
                                    height: '144px',
                                    width: '144px',
                                    objectFit: 'contain'
                                }}
                            />

                        </div>
                    </Placeholder>
                </Modal>
            </div>
        </Page>
    );
} 