# Configurable Wheel Component

A highly customizable wheel of fortune component built with Canvas that supports:
- Variable number of sectors
- Text and image content
- High-quality rendering with 2x supersampling
- Customizable colors, fonts, and animations
- Realistic spinning animation with blur effect

## Basic Usage

```tsx
import { WheelComponent, WheelPrize } from '@/components/Wheel/WheelComponent';

// Define your prize data
const prizes: WheelPrize[] = [
  { id: 1, text: 'Prize 1' },
  { id: 2, text: 'Prize 2' },
  { id: 3, text: 'Prize 3' },
  { id: 4, text: 'Prize 4' },
  // Add as many prizes as you need
];

function MyWheelPage() {
  const handleSpinComplete = (prize: WheelPrize) => {
    console.log(`You won: ${prize.text}`);
    // Handle prize logic here
  };

  return (
    <WheelComponent
      prizes={prizes}
      onSpinComplete={handleSpinComplete}
    />
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `prizes` | `WheelPrize[]` | Array of prize data objects |
| `onSpinComplete` | `(prize: WheelPrize) => void` | Callback when spinning completes |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `outerBorderColor` | `string` | `#d6b56d` | Color of the outer wheel border |
| `outerBorderWidth` | `number` | `20` | Width of the outer border in pixels |
| `innerBorderColor` | `string` | `#16171b` | Color of the inner circle border |
| `innerBorderWidth` | `number` | `15` | Width of the inner circle border |
| `innerRadius` | `number` | `0.3` | Inner circle radius as a proportion of wheel radius |
| `textDistance` | `number` | `0.7` | Distance of text from center (0-1) |
| `spinDuration` | `number` | `7000` | Spin animation duration in ms |
| `spinAmount` | `number` | `7` | Number of full rotations during spin |
| `fontSize` | `number` | `16` | Font size for prize text |
| `fontFamily` | `string` | `Arial, sans-serif` | Font family for prize text |
| `canvasWidth` | `number` | `500` | Width of the wheel canvas |
| `canvasHeight` | `number` | `500` | Height of the wheel canvas |
| `centerImage` | `string` | `undefined` | URL of the image for wheel center |
| `onlyShowImageIfPresent` | `boolean` | `false` | Hide text if image is available |
| `disabled` | `boolean` | `false` | Disable wheel spinning |
| `lineWidth` | `number` | `3` | Width of divider lines between sectors |
| `lineColor` | `string` | `#d4af37` | Color of divider lines |

## WheelPrize Interface

```ts
interface WheelPrize {
  id: number | string;       // Unique identifier
  text?: string;             // Prize text (optional)
  imageUrl?: string;         // URL to prize image (optional)
  backgroundColor?: string;  // Background color (optional)
  textColor?: string;        // Text color (optional)
}
```

## Customization Examples

### Custom Colors

```tsx
<WheelComponent
  prizes={prizes}
  onSpinComplete={handleSpinComplete}
  outerBorderColor="#4a90e2"
  innerBorderColor="#263238"
  lineColor="#90caf9"
/>
```

### Custom Size & Font

```tsx
<WheelComponent
  prizes={prizes}
  onSpinComplete={handleSpinComplete}
  canvasWidth={400}
  canvasHeight={400}
  fontSize={18}
  fontFamily="'Roboto', sans-serif"
/>
```

### With Center Logo

```tsx
<WheelComponent
  prizes={prizes}
  onSpinComplete={handleSpinComplete}
  centerImage="/path/to/logo.png"
  innerRadius={0.25}
/>
``` 