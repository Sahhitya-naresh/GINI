import { EmailProvider } from './types';
import { GmailProvider } from './gmailProvider';

class EmailProviderRegistry {
  private providers: Map<string, EmailProvider> = new Map();

  constructor() {
    // Register standard default Gmail provider
    const defaultGmail = new GmailProvider();
    this.register(defaultGmail);
  }

  register(provider: EmailProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  getProvider(providerType?: string): EmailProvider {
    const key = (providerType || 'gmail').trim().toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      console.warn(`[EmailRegistry] Provider "${providerType}" not registered. Falling back to Gmail.`);
      return this.providers.get('gmail')!;
    }
    return provider;
  }

  listProviders(): { id: string; displayName: string }[] {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      displayName: p.displayName
    }));
  }
}

export const emailProviderRegistry = new EmailProviderRegistry();

export function getEmailProvider(providerType?: string): EmailProvider {
  return emailProviderRegistry.getProvider(providerType);
}
