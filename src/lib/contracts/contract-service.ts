import { supabase } from '@/lib/supabase';

export interface ContractData {
  id: string;
  planId: string;
  fullName: string;
  email: string;
  contractHtml: string;
  signature: string;
  contractVersion: string;
  createdAt: string;
}

class ContractService {
  async getContractTemplate(planId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key_value')
        .eq('key_name', `contract_template_${planId}`)
        .single();

      if (error) {
        console.error('Error fetching contract template:', error);
        return this.getDefaultTemplate(planId);
      }

      return data?.key_value || this.getDefaultTemplate(planId);
    } catch (error) {
      console.error('Error in getContractTemplate:', error);
      return this.getDefaultTemplate(planId);
    }
  }

  private getDefaultTemplate(planId: string): string {
    return `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
        <h1 style="text-align: center;">הסכם שירות - תכנית ${planId}</h1>
        <p>הסכם זה נחתם בין החברה לבין הלקוח.</p>
        <p>התנאים וההסכמות מפורטים להלן...</p>
        <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px;">
          <p><strong>חתימת הלקוח:</strong></p>
          <div id="signature-area" style="height: 100px; border: 1px dashed #ccc; margin: 10px 0;"></div>
        </div>
      </div>
    `;
  }

  async saveContract(contractData: Omit<ContractData, 'id' | 'createdAt'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('contract_signatures')
        .insert({
          plan_id: contractData.planId,
          full_name: contractData.fullName,
          email: contractData.email,
          contract_html: contractData.contractHtml,
          signature: contractData.signature,
          contract_version: contractData.contractVersion,
          agreed_to_terms: true,
          agreed_to_privacy: true
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving contract:', error);
      throw error;
    }
  }

  async getContractById(id: string): Promise<ContractData | null> {
    try {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ContractData;
    } catch (error) {
      console.error('Error fetching contract:', error);
      return null;
    }
  }

  async verifyContractSignature(contractId: string, signature: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('signature')
        .eq('id', contractId)
        .single();

      if (error) throw error;
      return data?.signature === signature;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  async processSignedContract(contractData: Omit<ContractData, 'id' | 'createdAt'>): Promise<string> {
    try {
      const contractId = await this.saveContract(contractData);
      // Additional processing logic can be added here
      return contractId;
    } catch (error) {
      console.error('Error processing signed contract:', error);
      throw error;
    }
  }
}

export const contractService = new ContractService();

// Export individual functions for direct import
export const getContractById = contractService.getContractById.bind(contractService);
export const verifyContractSignature = contractService.verifyContractSignature.bind(contractService);
export const processSignedContract = contractService.processSignedContract.bind(contractService);
