import { Text } from '@telegram-apps/telegram-ui';
import { useCountUp } from '@/hooks/useCountUp';
import './AnimatedBalance.css';

interface AnimatedBalanceProps {
  value: number;
  style?: React.CSSProperties;
  duration?: number;
  marginBottom?: string;
}

export function AnimatedBalance({ value, style, duration = 1000, marginBottom = '2px' }: AnimatedBalanceProps) {
  const { value: animatedValue, isAnimating } = useCountUp(value, { duration });

  return (
    <Text 
      weight="1" 
      style={{ 
        fontSize: '24px', 
        lineHeight: '24px', 
        marginBottom: marginBottom, 
        color: '#fff',
        ...style 
      }}
      className={`animated-balance ${isAnimating ? 'counting' : ''}`}
    >
      {animatedValue}
    </Text>
  );
} 