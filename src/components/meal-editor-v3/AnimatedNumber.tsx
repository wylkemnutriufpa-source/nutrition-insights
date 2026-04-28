import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, prefix = '', suffix = '', className }) => {
  const springValue = useSpring(value, {
    mass: 0.8,
    stiffness: 75,
    damping: 15,
  });

  const display = useTransform(springValue, (current) => 
    `${prefix}${Math.round(current)}${suffix}`
  );

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span className={className}>{display}</motion.span>;
};
