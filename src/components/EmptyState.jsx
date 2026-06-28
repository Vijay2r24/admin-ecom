import React, { useEffect } from "react";
import Lottie from "lottie-react";
import emptyBoxAnimation from "../assets/animations/empty-box-lottie.json";

const C = "#FF5A5F";
const PRIMARY_COLOR = "#5B45E0";
const SECONDARY_COLOR = "#6366F1";
const SUCCESS_COLOR = "#10B981";
const WARNING_COLOR = "#F59E0B";
const INFO_COLOR = "#3B82F6";

const EmptyState = ({ type = "default", title, description, actionLabel, onAction, compact = false }) => {
  useEffect(() => {
    // Add visually appealing CSS animations with vibrant colors
    const style = document.createElement('style');
    style.textContent = `
      @keyframes vibrantFloat {
        0%, 100% { 
          transform: translateY(0px) scale(1) rotate(0deg); 
          filter: brightness(1) saturate(1);
        }
        25% { 
          transform: translateY(-12px) scale(1.05) rotate(3deg); 
          filter: brightness(1.2) saturate(1.1);
        }
        50% { 
          transform: translateY(-25px) scale(1.08) rotate(-3deg); 
          filter: brightness(1.3) saturate(1.2);
        }
        75% { 
          transform: translateY(-12px) scale(1.03) rotate(1deg); 
          filter: brightness(1.2) saturate(1.1);
        }
      }
      @keyframes vibrantPulse {
        0%, 100% { 
          opacity: 0.85; 
          transform: scale(1);
          filter: brightness(1) saturate(1);
        }
        50% { 
          opacity: 1; 
          transform: scale(1.12);
          filter: brightness(1.25) saturate(1.15);
        }
      }
      @keyframes vibrantBounce {
        0%, 100% { 
          transform: translateY(0) scale(1); 
          opacity: 0.85;
        }
        25% { 
          transform: translateY(-20px) scale(1.08); 
          opacity: 0.95;
        }
        50% { 
          transform: translateY(-35px) scale(1.12); 
          opacity: 1;
        }
        75% { 
          transform: translateY(-15px) scale(1.05); 
          opacity: 0.95;
        }
      }
      @keyframes vibrantShimmer {
        0% { 
          background-position: -200% 0;
          transform: translateX(-100%) rotate(0deg);
        }
        50% {
          transform: translateX(0%) rotate(180deg);
        }
        100% { 
          background-position: 200% 0;
          transform: translateX(100%) rotate(360deg);
        }
      }
      @keyframes vibrantRotate {
        0% { 
          transform: rotate(0deg) scale(1); 
          opacity: 0.85;
        }
        50% { 
          transform: rotate(180deg) scale(1.1); 
          opacity: 1;
        }
        100% { 
          transform: rotate(360deg) scale(1); 
          opacity: 0.85;
        }
      }
      @keyframes vibrantGlow {
        0%, 100% { 
          box-shadow: 
            0 0 25px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.4),
            0 0 50px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.2),
            0 0 75px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.1);
        }
        50% { 
          box-shadow: 
            0 0 40px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.6),
            0 0 80px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.4),
            0 0 120px rgba(var(--glow-r), var(--glow-g), var(--glow-b), 0.2);
        }
      }
      @keyframes sparkle {
        0%, 100% { 
          opacity: 0; 
          transform: scale(0) rotate(0deg);
        }
        50% { 
          opacity: 1; 
          transform: scale(1) rotate(180deg);
        }
      }
      .empty-state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: ${compact ? '2.5rem 1.5rem' : '4rem 2rem'};
        background: transparent;
        border-radius: 0;
        min-height: ${compact ? '280px' : '380px'};
        position: relative;
        overflow: visible;
        box-shadow: none;
        border: none;
      }
      .empty-state-container::before {
        display: none;
      }
      .empty-state-container::after {
        display: none;
      }
      .animation-wrapper {
        width: ${compact ? '120px' : '160px'};
        height: ${compact ? '120px' : '160px'};
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: transparent;
        border-radius: 0;
        backdrop-filter: none;
        box-shadow: none;
        border: none;
        overflow: visible;
      }
      .animation-wrapper::before {
        display: none;
      }
      .orders-animation {
        width: 75%;
        height: 55%;
        background: 
          linear-gradient(135deg, ${WARNING_COLOR} 0%, #f59e0b 25%, #d97706 75%, #b45309 100%),
          radial-gradient(circle at 25% 25%, rgba(254, 243, 199, 0.4) 0%, transparent 50%);
        background-size: 100% 100%, 100% 100%;
        border-radius: 12px;
        position: relative;
        animation: vibrantFloat 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        box-shadow: 
          0 6px 20px rgba(245, 158, 11, 0.25),
          0 3px 10px rgba(245, 158, 11, 0.15),
          inset 0 2px 0 rgba(255, 255, 255, 0.7);
        --glow-r: 245;
        --glow-g: 158;
        --glow-b: 11;
        animation: vibrantFloat 4s cubic-bezier(0.4, 0, 0.2, 1) infinite, vibrantGlow 3s ease-in-out infinite;
      }
      .orders-animation::before {
        content: '0';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #92400e;
        font-size: ${compact ? '24px' : '32px'};
        font-weight: 700;
        letter-spacing: -0.5px;
        text-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.3),
          0 4px 8px rgba(0, 0, 0, 0.2);
      }
      .orders-animation::after {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(
          45deg, 
          transparent 20%, 
          rgba(255, 255, 255, 0.5) 40%, 
          transparent 60%
        );
        border-radius: 12px;
        animation: vibrantShimmer 4s linear infinite;
        z-index: 1;
      }
      .users-animation {
        width: 75%;
        height: 75%;
        background: 
          radial-gradient(circle at 30% 30%, ${INFO_COLOR} 0%, #3b82f6 40%, #2563eb 100%),
          radial-gradient(circle at 70% 70%, rgba(147, 197, 253, 0.4) 0%, transparent 50%);
        background-size: 100% 100%, 100% 100%;
        border-radius: 50%;
        position: relative;
        animation: vibrantBounce 3s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        box-shadow: 
          0 8px 25px rgba(59, 130, 246, 0.25),
          0 4px 12px rgba(59, 130, 246, 0.15),
          inset 0 2px 0 rgba(255, 255, 255, 0.8);
        --glow-r: 59;
        --glow-g: 130;
        --glow-b: 246;
        animation: vibrantBounce 3s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite, vibrantGlow 2.5s ease-in-out infinite;
      }
      .users-animation::before {
        content: '0';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #1e3a8a;
        font-size: ${compact ? '24px' : '32px'};
        font-weight: 700;
        letter-spacing: -0.5px;
        text-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.3),
          0 4px 8px rgba(0, 0, 0, 0.2);
      }
      .users-animation::after {
        content: '';
        position: absolute;
        top: 15%;
        left: 15%;
        width: 30%;
        height: 30%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
        border-radius: 50%;
        animation: vibrantPulse 2.5s ease-in-out infinite;
      }
      .products-animation {
        width: 75%;
        height: 65%;
        background: 
          linear-gradient(135deg, #fde047 0%, #facc15 25%, #eab308 75%, #ca8a04 100%),
          linear-gradient(45deg, transparent 20%, rgba(254, 243, 199, 0.3) 50%, transparent 70%);
        background-size: 100% 100%, 200% 200%;
        border-radius: 10px;
        position: relative;
        animation: vibrantRotate 10s linear infinite, vibrantPulse 4s ease-in-out infinite;
        box-shadow: 
          0 8px 25px rgba(234, 179, 8, 0.25),
          0 4px 12px rgba(234, 179, 8, 0.15),
          inset 0 2px 0 rgba(255, 255, 255, 0.8);
        --glow-r: 234;
        --glow-g: 179;
        --glow-b: 8;
        transform-style: preserve-3d;
      }
      .products-animation::before {
        content: '0';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #713f12;
        font-size: ${compact ? '24px' : '32px'};
        font-weight: 700;
        letter-spacing: -0.5px;
        text-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.3),
          0 4px 8px rgba(0, 0, 0, 0.2);
        z-index: 2;
      }
      .products-animation::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          135deg, 
          transparent 30%, 
          rgba(255, 255, 255, 0.4) 50%, 
          transparent 70%
        );
        border-radius: 10px;
        animation: vibrantShimmer 5s linear infinite;
        z-index: 1;
      }
      .payments-animation {
        width: 75%;
        height: 55%;
        background: 
          linear-gradient(135deg, ${SUCCESS_COLOR} 0%, #84cc16 25%, #65a30d 75%, #4d7c0f 100%),
          radial-gradient(circle at 70% 30%, rgba(220, 252, 231, 0.4) 0%, transparent 50%);
        background-size: 100% 100%, 100% 100%;
        border-radius: 16px;
        position: relative;
        animation: vibrantFloat 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        box-shadow: 
          0 8px 25px rgba(34, 197, 94, 0.25),
          0 4px 12px rgba(34, 197, 94, 0.15),
          inset 0 2px 0 rgba(255, 255, 255, 0.8);
        --glow-r: 34;
        --glow-g: 197;
        --glow-b: 94;
        animation: vibrantFloat 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite, vibrantGlow 2.8s ease-in-out infinite;
      }
      .payments-animation::before {
        content: '0';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #166534;
        font-size: ${compact ? '24px' : '32px'};
        font-weight: 700;
        letter-spacing: -0.5px;
        text-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.3),
          0 4px 8px rgba(0, 0, 0, 0.2);
      }
      .payments-animation::after {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(
          90deg, 
          transparent 20%, 
          rgba(255, 255, 255, 0.5) 40%, 
          transparent 60%
        );
        border-radius: 16px;
        animation: vibrantShimmer 3s linear infinite;
        z-index: 1;
      }
      .empty-box-animation {
        width: 80px;
        height: 80px;
        position: relative;
        animation: vibrantFloat 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        --glow-r: 91;
        --glow-g: 69;
        --glow-b: 224;
        filter: drop-shadow(0 0 20px rgba(91, 69, 224, 0.3));
      }
      .empty-box-animation::before {
        content: '';
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        bottom: 30px;
        border: 3px solid #5B45E0;
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(91, 69, 224, 0.1) 0%, rgba(91, 69, 224, 0.05) 100%);
        box-shadow: 
          inset 0 2px 4px rgba(91, 69, 224, 0.2),
          0 4px 8px rgba(0, 0, 0, 0.1);
      }
      .empty-box-animation::after {
        content: '';
        position: absolute;
        top: 0;
        left: 10px;
        right: 10px;
        height: 20px;
        border: 3px solid #5B45E0;
        border-bottom: none;
        border-radius: 8px 8px 0 0;
        background: linear-gradient(135deg, rgba(91, 69, 224, 0.15) 0%, rgba(91, 69, 224, 0.08) 100%);
        transform-origin: top center;
        animation: boxLid 3s ease-in-out infinite;
        box-shadow: 
          inset 0 2px 4px rgba(91, 69, 224, 0.3),
          0 -2px 8px rgba(0, 0, 0, 0.1);
      }
      @keyframes boxLid {
        0%, 100% { 
          transform: rotateX(0deg); 
        }
        25% { 
          transform: rotateX(-15deg); 
        }
        50% { 
          transform: rotateX(10deg); 
        }
        75% { 
          transform: rotateX(-5deg); 
        }
      }
      .default-animation {
        width: 75%;
        height: 75%;
        background: 
          linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #6366F1 50%, #4F46E5 100%),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 60%);
        background-size: 100% 100%, 100% 100%;
        border-radius: 12px;
        position: relative;
        animation: vibrantPulse 5s ease-in-out infinite;
        box-shadow: 
          0 8px 25px rgba(91, 69, 224, 0.25),
          0 4px 12px rgba(91, 69, 224, 0.15),
          inset 0 2px 0 rgba(255, 255, 255, 0.8);
        --glow-r: 91;
        --glow-g: 69;
        --glow-b: 224;
        animation: vibrantPulse 5s ease-in-out infinite, vibrantGlow 3.5s ease-in-out infinite;
      }
      .default-animation::before {
        content: '0';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: ${compact ? '24px' : '32px'};
        font-weight: 700;
        letter-spacing: -0.5px;
        text-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.3),
          0 4px 8px rgba(0, 0, 0, 0.2);
      }
      .default-animation::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          45deg, 
          transparent 30%, 
          rgba(255, 255, 255, 0.3) 50%, 
          transparent 70%
        );
        border-radius: 12px;
        animation: vibrantShimmer 6s linear infinite;
        z-index: 1;
      }
      .empty-state-title {
        font-size: ${compact ? '1rem' : '1.25rem'};
        font-weight: 600;
        color: #1f2937;
        text-align: center;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        position: relative;
        z-index: 1;
        letter-spacing: -0.025em;
      }
      .empty-state-description {
        font-size: ${compact ? '0.875rem' : '1rem'};
        color: #6b7280;
        text-align: center;
        max-width: ${compact ? '20rem' : '28rem'};
        line-height: 1.6;
        position: relative;
        z-index: 1;
        font-weight: 400;
      }
      .empty-state-action {
        margin-top: ${compact ? '1rem' : '2rem'};
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        font-size: ${compact ? '0.875rem' : '1rem'};
        font-weight: 600;
        color: white;
        background: 
          linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #6366F1 100%);
        border: none;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
          0 4px 20px rgba(91, 69, 224, 0.25),
          0 2px 10px rgba(91, 69, 224, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        position: relative;
        z-index: 1;
        letter-spacing: 0.025em;
      }
      .empty-state-action:hover {
        box-shadow: 
          0 8px 30px rgba(91, 69, 224, 0.35),
          0 4px 15px rgba(91, 69, 224, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.4);
        transform: translateY(-2px);
      }
      .empty-state-action:active {
        transform: translateY(-1px) scale(0.98);
      }
      .empty-state-action-compact {
        margin-top: 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: ${PRIMARY_COLOR};
        background: none;
        border: none;
        cursor: pointer;
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: all 0.3s ease;
        position: relative;
        z-index: 1;
        letter-spacing: 0.025em;
      }
      .empty-state-action-compact:hover {
        color: #4F46E5;
        text-decoration-color: #4F46E5;
      }
      .empty-state-action-compact::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: ${PRIMARY_COLOR};
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }
      .empty-state-action-compact:hover::after {
        transform: scaleX(1);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [compact]);

  const getAnimationClass = () => {
    switch (type) {
      case 'orders': return 'orders-animation';
      case 'users': return 'users-animation';
      case 'products': return 'products-animation';
      case 'payments': return 'payments-animation';
      case 'empty-box': return 'empty-box-animation';
      default: return 'default-animation';
    }
  };

  if (compact) {
    return (
      <div className="empty-state-container">
        <div className="animation-wrapper">
          <Lottie 
            animationData={emptyBoxAnimation}
            style={{ 
              width: 120, 
              height: 120
            }}
            loop={true}
            autoplay={true}
          />
        </div>
        <h3 className="empty-state-title">{title}</h3>
        {description && <p className="empty-state-description">{description}</p>}
        {actionLabel && onAction && (
          <button onClick={onAction} className="empty-state-action-compact">
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="empty-state-container">
      <div className="animation-wrapper">
          <Lottie 
            animationData={emptyBoxAnimation}
            style={{ 
              width: 160, 
              height: 160
            }}
            loop={true}
            autoplay={true}
          />
        </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="empty-state-action">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
