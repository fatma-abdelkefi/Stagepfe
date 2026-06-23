import { API_CONFIG } from '../../../shared/config/api';

export type AIAuthResult = {
  success: boolean;
  message: string;
  authenticated?: boolean;
  status?: string;
};

export async function checkAIAuthentication(): Promise<AIAuthResult> {
  try {
    const response = await fetch(`${API_CONFIG.AI_BASE_URL}/ai/auth/check`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          data?.detail ||
          data?.message ||
          "Impossible d'authentifier le service IA.",
      };
    }

    return {
      success: !!data?.success,
      authenticated: !!data?.authenticated,
      status: data?.status,
      message:
        data?.message ||
        'Service IA connecté avec succès.',
    };
  } catch (error: any) {
    console.log('AI AUTH CHECK ERROR:', error?.message || error);

    return {
      success: false,
      message:
        error?.message ||
        "Impossible de contacter le service IA.",
    };
  }
}