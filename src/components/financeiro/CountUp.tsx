import React, { useState, useEffect } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

const CountUp: React.FC<CountUpProps> = ({ 
  value, 
  duration = 1200, 
  formatter = (val) => val.toFixed(0),
  className 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      
      const current = startValue + easeOut * (value - startValue);
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span className={className}>{formatter(displayValue)}</span>;
};

export default CountUp;
