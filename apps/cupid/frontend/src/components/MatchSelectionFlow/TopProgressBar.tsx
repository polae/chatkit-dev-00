interface TopProgressBarProps {
  step: 1 | 2 | 3;
}

export function TopProgressBar({ step }: TopProgressBarProps) {
  return (
    <div className="ms-top-progress" role="img" aria-label={`Step ${step} of 3`}>
      <div className={`ms-top-progress-step ${step >= 1 ? "completed" : ""} ${step === 1 ? "active" : ""}`}>
        <span className="ms-top-progress-number">1</span>
      </div>
      <div className={`ms-top-progress-connector ${step >= 2 ? "completed" : ""}`} />
      <div className={`ms-top-progress-step ${step >= 2 ? "completed" : ""} ${step === 2 ? "active" : ""}`}>
        <span className="ms-top-progress-number">2</span>
      </div>
      <div className={`ms-top-progress-connector ${step >= 3 ? "completed" : ""}`} />
      <div className={`ms-top-progress-step ${step >= 3 ? "completed" : ""} ${step === 3 ? "active" : ""}`}>
        <span className="ms-top-progress-number">3</span>
      </div>
    </div>
  );
}


