import { ResponsiveContainer } from 'recharts';
import useMediaQuery from '../../hooks/useMediaQuery';

export default function ResponsiveChartContainer({
  children,
  aspectDesktop = 2,
  aspectMobile = 1.2,
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const aspect = isDesktop ? aspectDesktop : aspectMobile;

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      {children}
    </ResponsiveContainer>
  );
}
