// This is a simplified version of the wheel.js logic
import axios from 'axios';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { WheelApiResponse, WheelInfoResponse, SetWalletResponse } from '@/types/common';

// Get wheel info and user balances
export async function getWheelInfo(): Promise<WheelInfoResponse> {
  try {
    // Get the Telegram WebApp initData from the launch parameters
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.tgWebAppData || '';
    
    // Make the axios POST request to get wheel info
    const { data } = await axios.post('/api/wheel/get', { initData });
    
    // Return the API response
    return data;
  } catch (error) {
    console.error('Error getting wheel info:', error);
    return { ok: false, err: 'Error getting wheel info' };
  }
}

// Real API call for the wheel spin using axios
export async function spinWheel(): Promise<WheelApiResponse> {
  try {
    // Get the Telegram WebApp initData from the launch parameters
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.tgWebAppData || '';
    
    console.log('Using initData:', initData);
    
    // Make the axios POST request to the wheel API
    const { data } = await axios.post('/api/wheel/roll', { initData });
    
    // Return the API response
    return data;
  } catch (error) {
    console.error('Error spinning wheel:', error);
    
    return { ok: false, err: 'Error spinning wheel' };
  }
}

// Set wallet address
export async function setWalletAddress(walletAddress: string): Promise<SetWalletResponse> {
  try {
    // Get the Telegram WebApp initData from the launch parameters
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.tgWebAppData || '';
    
    // Make the axios POST request to set wallet address
    const { data } = await axios.post('/api/wheel/set-wallet', { initData, walletAddress });
    
    // Return the API response
    return data;
  } catch (error) {
    console.error('Error setting wallet address:', error);
    return { ok: false, err: 'Error setting wallet address' };
  }
}

export default {
  spinWheel,
  getWheelInfo,
  setWalletAddress
}; 