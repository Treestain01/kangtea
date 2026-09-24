import type { OrderStatus } from '@bbt/shared';
import './order.css';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'received', label: 'Received' },
  { status: 'making', label: 'Being made' },
  { status: 'ready', label: 'Ready for pickup' },
];

type OrderStatusStepsProps = {
  status: OrderStatus;
};

/** Three step progress for an active order. The current step carries aria-current="step". */
export function OrderStatusSteps({ status }: OrderStatusStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="steps" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
        return (
          <li
            key={step.status}
            className={`steps__step steps__step--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="steps__marker" aria-hidden="true" />
            <span className="steps__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
