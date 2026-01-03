import React, { useState, useEffect, useRef, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { ScanLine, Video, VideoOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { toast } from '@/components/ui/use-toast';
    import QrScanner from 'qr-scanner';
    import { supabase } from '@/lib/supabaseClient';

    function parsePayload(txt) {
      try {
        const u = new URL(txt);
        const m = u.pathname.match(/\/c\/([^/]+)\/([^/?#]+)/);
        if (m) return { projectId: m[1], googleSub: m[2] };
        const p = new URLSearchParams(u.search);
        if (p.get('p') || p.get('s')) return { projectId: p.get('p') || undefined, googleSub: p.get('s') || undefined };
      } catch {
        const p = new URLSearchParams(txt);
        if (p.get('p') || p.get('s')) return { projectId: p.get('p') || undefined, googleSub: p.get('s') || undefined };
      }
      return {};
    }

    const ScannerTab = ({ projectId: establishmentProjectId }) => {
      const videoRef = useRef(null);
      const [scanner, setScanner] = useState(null);
      const [isScanning, setIsScanning] = useState(false);
      const [scanResult, setScanResult] = useState(null);
      const [isProcessing, setIsProcessing] = useState(false);

      const onScan = useCallback(async (txt) => {
        if (isProcessing) return;

        setIsProcessing(true);
        scanner?.stop();
        setIsScanning(false);

        try {
          const { projectId, googleSub } = parsePayload(txt);
          if (!projectId || !googleSub) {
            throw new Error('QR Code inválido ou em formato não reconhecido.');
          }
          if (projectId !== establishmentProjectId) {
            throw new Error('Este QR Code pertence a outro estabelecimento.');
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Sessão expirada. Faça login novamente.');
          }

          const { data, error } = await supabase.functions.invoke('scanner-visit', {
            body: { projectId, qrData: txt }
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          setScanResult({ success: true, data });
          toast({
            title: "Visita Registrada! 🎉",
            description: `Cliente agora tem ${data.points} ponto(s).`,
          });

        } catch (error) {
          setScanResult({ success: false, error: error.message });
          toast({
            title: "Erro ao Registrar Visita",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setTimeout(() => {
            setIsProcessing(false);
            setScanResult(null);
          }, 5000);
        }
      }, [establishmentProjectId, isProcessing, scanner]);

      useEffect(() => {
        if (videoRef.current && !scanner) {
          const qrScanner = new QrScanner(
            videoRef.current,
            (result) => onScan(result.data),
            { highlightScanRegion: true, highlightCodeOutline: true }
          );
          setScanner(qrScanner);
        }
        return () => { scanner?.destroy(); };
      }, [onScan, scanner]);

      const toggleScan = () => {
        if (!scanner) return;
        if (isScanning) {
          scanner.stop();
          setIsScanning(false);
        } else {
          scanner.start().then(() => {
            setIsScanning(true);
            setScanResult(null);
          }).catch(err => {
            console.error(err);
            toast({
              title: "Erro na Câmera",
              description: "Não foi possível acessar a câmera. Verifique as permissões.",
              variant: "destructive",
            });
          });
        }
      };

      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100"
          >
            <h2 className="text-2xl font-bold mb-6">Scanner de QR Code</h2>
            
            <div className="relative w-full aspect-square max-w-md mx-auto bg-gray-900 rounded-2xl overflow-hidden shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4 transition-opacity" style={{ opacity: isScanning ? 0 : 1 }}>
                {isProcessing && <Loader2 className="w-16 h-16 animate-spin text-purple-400" />}
                {scanResult?.success === true && (
                  <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold">Visita Registrada!</h3>
                    <p className="text-lg">{scanResult.data.points} ponto(s) no total.</p>
                    {scanResult.data.completed && <p className="font-bold text-yellow-300 mt-2">Recompensa desbloqueada!</p>}
                  </motion.div>
                )}
                {scanResult?.success === false && (
                  <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} className="text-center">
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold">Falha no Scan</h3>
                    <p className="text-sm mt-2">{scanResult.error}</p>
                  </motion.div>
                )}
                {!isProcessing && !scanResult && (
                  <>
                    <ScanLine className="w-16 h-16 text-purple-400 mb-4" />
                    <p className="text-center">Aponte a câmera para o QR Code do cliente.</p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={toggleScan}
                disabled={isProcessing}
                className={`w-full max-w-md gap-2 text-lg py-6 transition-all duration-300 ${
                  isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                }`}
              >
                {isScanning ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                {isScanning ? 'Parar Scanner' : 'Iniciar Scanner'}
              </Button>
            </div>
          </motion.div>
        </div>
      );
    };

    export default ScannerTab;