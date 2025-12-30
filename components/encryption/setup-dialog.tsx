'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, CheckCircle2, Key, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EncryptionSetupDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [step, setStep] = useState<'intro' | 'show-key' | 'confirm'>('intro');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSetupNeeded();
  }, []);

  async function checkSetupNeeded() {
    try {
      const res = await fetch('/api/encryption/check-setup');
      const data = await res.json();

      if (data.isFirstTime && data.recoveryPhrase) {
        setRecoveryPhrase(data.recoveryPhrase);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to check encryption setup:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!recoveryPhrase) return;
    navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadRecoveryFile() {
    if (!recoveryPhrase) return;

    const content = `Chrononaut Recovery Phrase
Generated: ${new Date().toLocaleString()}

IMPORTANT: Keep this phrase secure and private.
You'll need it to recover your data if you reinstall the app.

Recovery Phrase:
${recoveryPhrase}

DO NOT SHARE THIS WITH ANYONE.
Chrononaut will never ask for your recovery phrase.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chrononaut-recovery-phrase.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        {step === 'intro' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-2xl">Welcome to Chrononaut</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                Your data is protected with end-to-end encryption
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We've generated a unique master encryption key for your account. This key:
              </p>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Encrypts all your journal entries, health data, and conversations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Stays on your device - never leaves your computer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ensures even we can't read your private data</span>
                </li>
              </ul>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  On the next screen, you'll see your <strong>recovery phrase</strong>. Save it somewhere safe in case you need to reinstall the app.
                </AlertDescription>
              </Alert>

              <Button onClick={() => setStep('show-key')} className="w-full" size="lg">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'show-key' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Key className="h-6 w-6 text-amber-600" />
                </div>
                <DialogTitle className="text-2xl">Your Recovery Phrase</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                Save this 24-word phrase in a secure location
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-sm font-medium">
                  ⚠️ You'll only see this once! Save it now.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg border-2 border-dashed">
                <p className="font-mono text-sm leading-relaxed break-words">
                  {recoveryPhrase}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>

                <Button
                  onClick={downloadRecoveryFile}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download as File
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  <strong>Why save this?</strong> If you reinstall Chrononaut or move to a new computer, you'll need this phrase to access your encrypted data.
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Keep it secret:</strong> Anyone with this phrase can decrypt your data.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setStep('confirm');
                  }}
                  className="flex-1"
                  size="lg"
                >
                  I've Saved It Securely
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  className="flex-1"
                >
                  I'll Save It Later
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <DialogTitle className="text-2xl">All Set!</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                Your data is now protected with end-to-end encryption
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                You're all set! From now on, all your data will be automatically encrypted before being saved.
              </p>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">What happens next:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Your journals, health data, and conversations are encrypted</li>
                  <li>✓ Your encryption key stays on this device</li>
                  <li>✓ Everything works exactly the same - encryption is transparent</li>
                </ul>
              </div>

              <Button
                onClick={() => setIsOpen(false)}
                className="w-full"
                size="lg"
              >
                Start Using Chrononaut
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
