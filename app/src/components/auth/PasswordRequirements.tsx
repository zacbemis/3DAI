import { getPasswordRuleResults } from '../../lib/validation';

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const results = getPasswordRuleResults(password);
  const started = password.length > 0;

  return (
    <ul className="flex flex-col gap-1 text-xs" aria-label="Password requirements">
      {results.map(({ rule, passed }) => (
        <li
          key={rule.key}
          className={`flex items-center gap-1.5 transition-colors ${
            !started
              ? 'text-zinc-600'
              : passed
                ? 'text-emerald-400'
                : 'text-zinc-500'
          }`}
        >
          <span className="inline-block w-3.5 text-center" aria-hidden>
            {!started ? '·' : passed ? '✓' : '✗'}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
