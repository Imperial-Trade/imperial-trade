
// API functions for external integrations
export const sendSlackNotification = async (message: string) => {
  try {
    console.log('Slack notification:', message);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return { success: false, error };
  }
};

export const sendDiscordNotification = async (message: string) => {
  try {
    console.log('Discord notification:', message);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    return { success: false, error };
  }
};
