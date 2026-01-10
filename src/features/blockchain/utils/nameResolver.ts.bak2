import { supabase } from '@/integrations/supabase/client';

/**
 * Name Resolution Utility
 * Resolves wallet addresses and emails to proper user names
 */
export class NameResolver {
  private static instance: NameResolver;
  private nameCache: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): NameResolver {
    if (!NameResolver.instance) {
      NameResolver.instance = new NameResolver();
    }
    return NameResolver.instance;
  }

  /**
   * Resolve a wallet address or email to a proper name
   */
  public async resolveName(identifier: string): Promise<string> {
    // Check cache first
    if (this.nameCache.has(identifier)) {
      return this.nameCache.get(identifier)!;
    }

    try {
      // If it's a wallet address (starts with 0x)
      if (identifier.startsWith('0x')) {
        const name = await this.resolveWalletAddress(identifier);
        this.nameCache.set(identifier, name);
        return name;
      }

      // If it's an email address
      if (identifier.includes('@')) {
        const name = await this.resolveEmail(identifier);
        this.nameCache.set(identifier, name);
        return name;
      }

      // If it's a UUID (profile ID), try to resolve it
      if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const name = await this.resolveProfileId(identifier);
        this.nameCache.set(identifier, name);
        return name;
      }

      // If it's already a name, return as is
      if (identifier && !identifier.includes('@') && !identifier.startsWith('0x')) {
        this.nameCache.set(identifier, identifier);
        return identifier;
      }

      // Default fallback
      const fallbackName = this.getFallbackName(identifier);
      this.nameCache.set(identifier, fallbackName);
      return fallbackName;
    } catch (error) {
      console.error('Error resolving name:', error);
      const fallbackName = this.getFallbackName(identifier);
      this.nameCache.set(identifier, fallbackName);
      return fallbackName;
    }
  }

  /**
   * Resolve wallet address to user name
   */
  private async resolveWalletAddress(walletAddress: string): Promise<string> {
    try {
      // Try to find user by wallet address in profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('wallet_address', walletAddress)
        .single();

      if (!error && profile && profile.full_name) {
        return profile.full_name;
      }

      // Try to find in profiles by user_id if we have it
      if (profile?.user_id) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', profile.user_id)
          .single();

        if (!profileError && userProfile?.full_name) {
          return userProfile.full_name;
        }
      }

      // Try to find user by wallet address in auth.users (this might not work in client-side)
      try {
        const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(walletAddress);
        if (!userError && user?.user?.user_metadata?.full_name) {
          return user.user.user_metadata.full_name;
        }
      } catch (adminError) {
        // Admin API might not be available in client-side, ignore
        console.warn('Admin API not available for user lookup:', adminError);
      }

      return this.getFallbackName(walletAddress);
    } catch (error) {
      console.error('Error resolving wallet address:', error);
      return this.getFallbackName(walletAddress);
    }
  }

  /**
   * Resolve email to user name
   */
  private async resolveEmail(email: string): Promise<string> {
    try {
      // Try to find user by email in profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, user_id')
        .eq('email', email)
        .single();

      if (!error && profile && profile.full_name) {
        return profile.full_name;
      }

      // Try to find user by email in auth.users (this might not work in client-side)
      try {
        const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(email);
        if (!userError && user?.user?.user_metadata?.full_name) {
          return user.user.user_metadata.full_name;
        }
      } catch (adminError) {
        // Admin API might not be available in client-side, ignore
        console.warn('Admin API not available for user lookup:', adminError);
      }

      // Try to find in profiles by user_id if we have it
      if (profile?.user_id) {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', profile.user_id)
          .single();

        if (!profileError && userProfile?.full_name) {
          return userProfile.full_name;
        }
      }

      // Extract name from email (before @)
      const emailName = email.split('@')[0];
      if (emailName && emailName.length > 2) {
        return emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }

      return this.getFallbackName(email);
    } catch (error) {
      console.error('Error resolving email:', error);
      return this.getFallbackName(email);
    }
  }

  /**
   * Resolve profile ID to user name
   */
  private async resolveProfileId(profileId: string): Promise<string> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', profileId)
        .single();

      if (!error && profile && profile.full_name) {
        return profile.full_name;
      }

      return this.getFallbackName(profileId);
    } catch (error) {
      console.error('Error resolving profile ID:', error);
      return this.getFallbackName(profileId);
    }
  }

  /**
   * Get fallback name based on identifier type
   */
  private getFallbackName(identifier: string): string {
    if (identifier.startsWith('0x')) {
      return `User ${identifier.slice(-4)}`;
    }
    
    if (identifier.includes('@')) {
      const emailName = identifier.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }

    if (identifier === 'Farm' || identifier === 'Farm Location') {
      return 'Farm Location';
    }

    if (identifier === 'Unknown Farmer' || identifier === 'Unknown Buyer' || identifier === 'Unknown Seller') {
      return 'Unknown User';
    }

    return identifier || 'Unknown User';
  }

  /**
   * Clear the name cache
   */
  public clearCache(): void {
    this.nameCache.clear();
  }

  /**
   * Get cached name
   */
  public getCachedName(identifier: string): string | undefined {
    return this.nameCache.get(identifier);
  }
}

// Export singleton instance
export const nameResolver = NameResolver.getInstance();
