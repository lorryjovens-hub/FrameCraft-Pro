import { useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  deviceType: DeviceType;
  isTouchDevice: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const TABLET_BREAKPOINT = 768;

export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return { deviceType: 'desktop', isTouchDevice: false, isMobile: false, isTablet: false, isDesktop: true };
    }
    return getDeviceInfo();
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', updateDeviceInfo);
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  return deviceInfo;
}

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { deviceType: 'desktop', isTouchDevice: false, isMobile: false, isTablet: false, isDesktop: true };
  }

  const width = window.innerWidth;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobile = width < TABLET_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < 1024;
  const isDesktop = width >= 1024;

  let deviceType: DeviceType = 'desktop';
  if (isMobile) {
    deviceType = 'mobile';
  } else if (isTablet) {
    deviceType = 'tablet';
  }

  return {
    deviceType,
    isTouchDevice,
    isMobile,
    isTablet,
    isDesktop,
  };
}