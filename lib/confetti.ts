export function createConfetti() {
  // Create confetti container
  const confettiContainer = document.createElement('div')
  confettiContainer.style.position = 'fixed'
  confettiContainer.style.top = '0'
  confettiContainer.style.left = '0'
  confettiContainer.style.width = '100%'
  confettiContainer.style.height = '100%'
  confettiContainer.style.pointerEvents = 'none'
  confettiContainer.style.zIndex = '9999'
  confettiContainer.style.overflow = 'hidden'

  document.body.appendChild(confettiContainer)

  // Create confetti pieces
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
  const shapes = ['🎉', '🎊', '⭐', '✨', '🌟', '💫']

  for (let i = 0; i < 50; i++) {
    const confettiPiece = document.createElement('div')
    const isEmoji = Math.random() > 0.5
    
    if (isEmoji) {
      confettiPiece.textContent = shapes[Math.floor(Math.random() * shapes.length)]
      confettiPiece.style.fontSize = Math.random() * 20 + 15 + 'px'
    } else {
      confettiPiece.style.width = Math.random() * 10 + 5 + 'px'
      confettiPiece.style.height = confettiPiece.style.width
      confettiPiece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confettiPiece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0'
    }

    confettiPiece.style.position = 'absolute'
    confettiPiece.style.left = Math.random() * 100 + '%'
    confettiPiece.style.top = '-10px'
    confettiPiece.style.transform = `rotate(${Math.random() * 360}deg)`
    confettiPiece.style.animation = `fall ${Math.random() * 2 + 1}s linear forwards`

    confettiContainer.appendChild(confettiPiece)
  }

  // Add CSS animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fall {
      0% {
        transform: translateY(-10px) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)

  // Clean up after animation
  setTimeout(() => {
    document.body.removeChild(confettiContainer)
    document.head.removeChild(style)
  }, 3000)
}
