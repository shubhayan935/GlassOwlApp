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

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      console.log('GlassOwl: Skipping initialization - server side');
      return;
    }

    // Don't initialize if already recording
    if (recorderRef.current?.isRecording) {
      console.log('GlassOwl: Skipping initialization - already recording');
      return;
    }

    console.log('GlassOwl: Initializing recorder...');

    const config: GlassOwlConfig = {
      apiKey,
      userId,
      endpoint,
    };

    console.log('GlassOwl: Config:', config);

    recorderRef.current = new Recorder(config);

    // Start recording after a short delay to let the page settle
    const timer = setTimeout(() => {
      console.log('GlassOwl: Starting recorder...');
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