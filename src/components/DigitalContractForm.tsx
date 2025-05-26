import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Download, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { contractService } from '@/lib/contracts/contract-service';
import { emailService } from '@/lib/contracts/email-service';
import { useAuth } from '@/contexts/auth/AuthContext';

interface DigitalContractFormProps {
  contractId?: string;
  onUploadSuccess?: (contractUrl: string) => void;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({ contractId, onUploadSuccess }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contractId) {
      fetchContractDetails(contractId);
    }
  }, [contractId]);

  const fetchContractDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_url')
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching contract details:", error);
        setError("Failed to load contract details.");
      } else if (data) {
        setContractUrl(data.contract_url);
      }
    } catch (err) {
      console.error("Error fetching contract details:", err);
      setError("Failed to load contract details.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated. Please sign in.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload file to Supabase storage
      const filePath = `contracts/${user.id}/${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        setError(`File upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const contractUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.Key}`;
      setContractUrl(contractUrl);

      // Save contract URL to the database
      if (contractId) {
        // Update existing contract
        const { error: updateError } = await supabase
          .from('contracts')
          .update({ contract_url: contractUrl })
          .eq('id', contractId);

        if (updateError) {
          console.error("Error updating contract URL:", updateError);
          setError(`Failed to update contract URL: ${updateError.message}`);
          setUploading(false);
          return;
        }
      } else {
        // Create new contract
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .insert([{ user_id: user.id, contract_url: contractUrl }])
          .select()

        if (contractError) {
          console.error("Error saving contract URL:", contractError);
          setError(`Failed to save contract URL: ${contractError.message}`);
          setUploading(false);
          return;
        }

        if (contractData && contractData.length > 0) {
          // Send email notification
          try {
            await emailService.sendContractUploadNotification(user.email, contractUrl);
            console.log('Contract upload notification email sent');
          } catch (emailError) {
            console.error('Error sending contract upload notification email:', emailError);
          }
        }
      }

      toast.success('File uploaded and contract URL saved successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(contractUrl);
      }
    } catch (err) {
      console.error("Unexpected error during upload:", err);
      setError(`An unexpected error occurred during upload.`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!contractUrl) {
      toast.error('No contract URL available to download.');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = contractUrl;
      link.download = 'contract.pdf'; // You might want to extract the filename from the URL
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      console.error("Error initiating download:", downloadError);
      toast.error('Failed to initiate download. Please try again.');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setFile(event.dataTransfer.files[0]);
    }
  };

  const handleBrowseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>העלאת חוזה דיגיטלי</CardTitle>
        <CardDescription>העלה את החוזה שלך בפורמט PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p>טוען פרטי חוזה...</p>
        ) : (
          <>
            {contractUrl ? (
              <div className="space-y-2">
                <p>החוזה שלך הועלה בהצלחה!</p>
                <Button variant="secondary" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  הורד חוזה
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleBrowseFiles}
              >
                <p>גרור לכאן קובץ או <span className="text-primary hover:underline">לחץ כאן לבחירה</span></p>
                {file && <p>קובץ נבחר: {file.name}</p>}
                <Input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading || !file} className="w-full">
              {uploading ? 'מעלה...' : 'שמור חוזה'}
              <Upload className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalContractForm;
