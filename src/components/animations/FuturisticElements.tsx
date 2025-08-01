'use client';

import React, { useEffect, useRef, useState } from 'react';

// Animated gradient background
export const AnimatedGradientBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-black"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] bg-blue-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-purple-500/5 rounded-full blur-3xl animate-pulse [animation-delay:4s]"></div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
    </div>
  );
};

// Floating 3D cube
export const FloatingCube: React.FC = () => {
  const cubeRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;
    
    let rotateX = 0;
    let rotateY = 0;
    let requestId: number;
    
    const animate = () => {
      rotateX += 0.2;
      rotateY += 0.3;
      if (cube) {
        cube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
      requestId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestId);
    };
  }, []);
  
  return (
    <div className="w-32 h-32 perspective-[800px] hidden lg:block">
      <div 
        ref={cubeRef} 
        className="w-full h-full relative transform-style-3d"
      >
        {/* Front face */}
        <div className="absolute inset-0 bg-cyan-500/20 border border-cyan-400/30 backdrop-blur-sm transform translate-z-[16px]"></div>
        {/* Back face */}
        <div className="absolute inset-0 bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm transform -translate-z-[16px]"></div>
        {/* Right face */}
        <div className="absolute inset-0 bg-purple-500/20 border border-purple-400/30 backdrop-blur-sm transform translate-x-[16px] rotate-y-90"></div>
        {/* Left face */}
        <div className="absolute inset-0 bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-sm transform -translate-x-[16px] rotate-y-90"></div>
        {/* Top face */}
        <div className="absolute inset-0 bg-teal-500/20 border border-teal-400/30 backdrop-blur-sm transform translate-y-[16px] rotate-x-90"></div>
        {/* Bottom face */}
        <div className="absolute inset-0 bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-sm transform -translate-y-[16px] rotate-x-90"></div>
      </div>
    </div>
  );
};

// Glowing text effect
export const GlowingText: React.FC<{
  text: string;
  className?: string;
}> = ({ text, className = '' }) => {
  return (
    <span className={`relative ${className}`}>
      <span className="absolute blur-md opacity-50 text-cyan-400">{text}</span>
      <span className="relative z-10">{text}</span>
    </span>
  );
};

// Animated typing text
export const TypedText: React.FC<{
  texts: string[];
  className?: string;
}> = ({ texts, className = '' }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const currentFullText = texts[currentTextIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        setDisplayText(currentFullText.substring(0, displayText.length + 1));
        
        // If we've typed the full text, start deleting after a pause
        if (displayText.length === currentFullText.length) {
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        // Deleting
        setDisplayText(currentFullText.substring(0, displayText.length - 1));
        
        // If we've deleted everything, move to next text
        if (displayText.length === 0) {
          setIsDeleting(false);
          setCurrentTextIndex((currentTextIndex + 1) % texts.length);
        }
      }
    }, isDeleting ? 50 : 100);
    
    return () => clearTimeout(timeout);
  }, [displayText, currentTextIndex, isDeleting, texts]);
  
  return (
    <span className={className}>
      {displayText}
      <span className="animate-blink">|</span>
    </span>
  );
};

// Particle effect
export const ParticleEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        
        // Colors: cyan, blue, purple
        const colors = ['rgba(6, 182, 212, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce off edges
        if (canvas && (this.x > canvas.width || this.x < 0)) {
          this.speedX = -this.speedX;
        }
        
        if (canvas && (this.y > canvas.height || this.y < 0)) {
          this.speedY = -this.speedY;
        }
      }
      
      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Create particles
    const particles: Particle[] = [];
    const particleCount = canvas ? Math.min(50, Math.floor((canvas.width * canvas.height) / 20000)) : 20;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      // Draw connections
      particles.forEach(a => {
        particles.forEach(b => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        });
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  return <canvas ref={canvasRef} className="absolute inset-0 -z-5" />;
};

// Hover glow effect for buttons
export const HoverGlowButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  primary?: boolean;
}> = ({ children, onClick, className = '', primary = false }) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative group overflow-hidden
        ${primary ? 
          'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700' : 
          'bg-transparent border-2 border-cyan-500/50 hover:border-cyan-400'}
        rounded-xl font-semibold transition-all duration-300 transform hover:scale-105
        ${className}
      `}
    >
      {/* Glow effect */}
      <span className={`
        absolute inset-0 w-full h-full
        ${primary ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-cyan-400'}
        opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300
      `}></span>
      
      {/* Button content */}
      <span className="relative z-10">{children}</span>
    </button>
  );
};
