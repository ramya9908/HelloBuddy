class SmartClickQueue {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('clickQueue') || '[]');
    this.isOnline = navigator.onLine;
    this.isSubmitting = false;
    this.setupEventListeners();
    this.startAutoSubmit();
    this.cleanupOldClicks();
  }
  
  addClick(postId, engagementType, reward) {
    const click = {
      id: Date.now() + Math.random(),
      postId,
      engagementType,
      reward,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.queue.push(click);
    this.saveQueue();
    
    // Update UI immediately (optimistic)
    this.updateEarningsDisplay(reward);
    this.disableButton(postId);
    
    this.checkSubmitTriggers();
    
    return click.id;
  }
  
  checkSubmitTriggers() {
    const pending = this.queue.filter(c => c.status === 'pending');
    const lastSubmit = parseInt(localStorage.getItem('lastSubmit') || '0');
    const timeSinceLastSubmit = Date.now() - lastSubmit;
    
    // Submit when 10+ clicks OR 5+ minutes passed OR 20+ total pending
    if (pending.length >= 10 || 
        timeSinceLastSubmit > 300000 || 
        pending.length >= 20) {
      this.submitQueue('auto_trigger');
    }
  }
  
  async submitQueue(trigger = 'manual') {
    if (this.isSubmitting) return;
    
    const pending = this.queue.filter(c => c.status === 'pending');
    if (pending.length === 0) return;
    
    this.isSubmitting = true;
    
    try {
      const queueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const response = await fetch('/api/clicks/batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          clicks: pending,
          trigger,
          queueId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Mark clicks as submitted
        pending.forEach(click => {
          click.status = 'submitted';
          click.submittedAt = Date.now();
        });
        
        this.saveQueue();
        localStorage.setItem('lastSubmit', Date.now().toString());
        
        // Show success notification
        this.showNotification(
          `✅ Batch processed: ${result.processed} clicks, ₹${result.earnings.toFixed(2)} earned`,
          'success'
        );
        
        // Clean up old submitted clicks
        this.cleanupSubmittedClicks();
        
      } else {
        const error = await response.json();
        console.warn('Batch submit failed:', error);
        
        if (response.status === 429) {
          this.showNotification('⏳ Rate limited, will retry later', 'warning');
        } else {
          this.showNotification('⚠️ Batch submit failed, will retry', 'warning');
        }
      }
    } catch (error) {
      console.warn('Batch submit error:', error);
      this.showNotification('📡 Offline - clicks saved for later', 'info');
    } finally {
      this.isSubmitting = false;
    }
  }
  
  setupEventListeners() {
    // Submit before page unload
    window.addEventListener('beforeunload', () => {
      if (this.queue.filter(c => c.status === 'pending').length > 0) {
        this.submitQueue('page_unload');
      }
    });
    
    // Submit when tab becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.queue.filter(c => c.status === 'pending').length > 0) {
        this.submitQueue('tab_hidden');
      }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNotification('🌐 Back online - syncing clicks', 'success');
      setTimeout(() => this.submitQueue('back_online'), 1000);
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNotification('📡 Offline mode - clicks will sync when online', 'info');
    });
  }
  
  startAutoSubmit() {
    // Auto-submit every 5 minutes
    setInterval(() => {
      if (this.isOnline && !this.isSubmitting) {
        this.submitQueue('timer');
      }
    }, 300000); // 5 minutes
    
    // Quick submit every 30 seconds if many pending
    setInterval(() => {
      const pending = this.queue.filter(c => c.status === 'pending');
      if (pending.length >= 5 && this.isOnline && !this.isSubmitting) {
        this.submitQueue('quick_timer');
      }
    }, 30000); // 30 seconds
  }
  
  updateEarningsDisplay(reward) {
    const earningsElements = document.querySelectorAll('.earnings-display, .earnings');
    earningsElements.forEach(element => {
      const current = parseFloat(element.textContent.replace(/[₹,]/g, '') || '0');
      element.textContent = `₹${(current + reward).toFixed(2)}`;
    });
  }
  
  disableButton(postId) {
    const button = document.querySelector(`[data-post-id="${postId}"]`);
    if (button) {
      button.disabled = true;
      button.textContent = 'Clicked ✓';
      button.classList.add('clicked');
      button.style.background = '#10b981';
      button.style.cursor = 'not-allowed';
    }
  }
  
  saveQueue() {
    try {
      localStorage.setItem('clickQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save queue to localStorage:', error);
    }
  }
  
  cleanupOldClicks() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.queue = this.queue.filter(click => 
      click.timestamp > oneDayAgo || click.status === 'pending'
    );
    this.saveQueue();
  }
  
  cleanupSubmittedClicks() {
    // Keep only pending clicks and recent submitted ones (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.queue = this.queue.filter(click => 
      click.status === 'pending' || 
      (click.status === 'submitted' && click.submittedAt > oneHourAgo)
    );
    this.saveQueue();
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `queue-notification queue-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      fontSize: '14px',
      zIndex: '10000',
      maxWidth: '300px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      background: type === 'success' ? '#10b981' : 
                 type === 'warning' ? '#f59e0b' : 
                 type === 'error' ? '#ef4444' : '#3b82f6'
    });
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
  
  // Get queue status for debugging
  getStatus() {
    const pending = this.queue.filter(c => c.status === 'pending');
    const submitted = this.queue.filter(c => c.status === 'submitted');
    
    return {
      total: this.queue.length,
      pending: pending.length,
      submitted: submitted.length,
      isOnline: this.isOnline,
      isSubmitting: this.isSubmitting,
      lastSubmit: new Date(parseInt(localStorage.getItem('lastSubmit') || '0'))
    };
  }
  
  // Force submit all pending (for manual trigger)
  forceSubmit() {
    return this.submitQueue('manual_force');
  }
  
  // Clear all queue data (for debugging)
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    localStorage.removeItem('lastSubmit');
    this.showNotification('🗑️ Queue cleared', 'info');
  }
}

// Export for use in React components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartClickQueue;
}

// Global instance for browser use
if (typeof window !== 'undefined') {
  window.SmartClickQueue = SmartClickQueue;
}