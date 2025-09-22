import React, { useEffect, useRef } from 'react';
import { Recorder } from './recorder/Recorder';
import { GlassOwlConfig } from './types';

interface GlassOwlProps extends GlassOwlConfig {
  children?: React.ReactNode;
}

export const GlassOwl: React.FC<GlassOwlProps> = ({
  apiKey,
  userId,
  endpoint,
  children,
}) => {
  const recorderRef = useRef<Recorder | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Only initialize on client side
    if (typeof window === 'undefined') return;

    const config: GlassOwlConfig = {
      apiKey,
      userId,
      endpoint,
    };

    recorderRef.current = new Recorder(config);

    // Start recording after a short delay to let the page settle
    const timer = setTimeout(() => {
      recorderRef.current?.start();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
    };
  }, [apiKey, userId, endpoint]);

  // Stop recording on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default GlassOwl;