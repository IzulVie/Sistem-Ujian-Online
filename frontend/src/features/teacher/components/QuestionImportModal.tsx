import React, { useState } from 'react';
import { apiClient } from '../../../shared/api/client';
import { X, Upload, Download, AlertCircle, FileText, Table, CheckCircle } from 'lucide-react';
import { toast } from '../../../shared/context/ToastContext';

interface QuestionImportModalProps {
  packageId?: number | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({ packageId, onSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState<'word' | 'excel'>('word');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setRowErrors([]);
      
      // Auto-switch active tab based on uploaded file type
      if (selected.name.endsWith('.docx')) {
        setActiveTab('word');
      } else if (selected.name.endsWith('.csv') || selected.name.endsWith('.xlsx')) {
        setActiveTab('excel');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setRowErrors([]);

    const formData = new FormData();
    formData.append('file', file);
    if (packageId) {
      formData.append('package_id', packageId.toString());
    }

    try {
      const res = await apiClient.post('/teacher/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Berhasil mengimpor butir soal ke dalam paket!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.message || 'Gagal mengimpor file.');
      if (data?.errors && Array.isArray(data.errors)) {
        setRowErrors(data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadWordTemplate = async () => {
    setDownloadingWord(true);
    try {
      const res = await apiClient.get('/teacher/questions/template/word', {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_soal.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template Microsoft Word (.docx) berhasil diunduh!');
    } catch (err) {
      toast.error('Gagal mengunduh template Word.');
      console.error('Download Word template error:', err);
    } finally {
      setDownloadingWord(false);
    }
  };

  const downloadExcelTemplate = () => {
    const csvContent = 
      "sep=;\n" +
      "soal;tipe_soal;tingkat_kesulitan;topik;pilihan_a;pilihan_b;pilihan_c;pilihan_d;pilihan_e;kunci_jawaban;pembahasan;pasangan_menjodohkan_1;pasangan_menjodohkan_2;pasangan_menjodohkan_3;pasangan_menjodohkan_4\n" +
      "\"Berapakah hasil dari 2 + 2 ?\";pilihan_ganda;mudah;Aritmatika;3;4;5;6;;B;\"2 + 2 = 4\";;;;\n" +
      "\"Pilihlah semua bilangan prima di bawah 10!\";pilihan_ganda_kompleks;sedang;Bilangan;2;3;4;9;;A,B;\"2 dan 3 adalah bilangan prima\";;;;\n" +
      "\"Sudut siku-siku memiliki besar 90 derajat.\";benar_salah;mudah;Geometri;;;;;;Benar;\"Sudut siku-siku selalu bernilai 90 derajat\";;;;\n" +
      "\"Jelaskan proses fotosintesis pada tumbuhan!\";essay;sedang;Biologi;;;;;;\"Proses pembentukan makanan oleh tumbuhan dengan bantuan klorofil dan sinar matahari.\";\"Reaksi terjadi di kloroplas.\";;;;\n" +
      "\"Jodohkan bahasa pemrograman berikut dengan logonya!\";menjodohkan;mudah;Teknologi;;;;;;;\"Kunci otomatis terpasang sesuai kolom jodohkan\";\"Python : Ular\";\"Java : Secangkir Kopi\";\"PHP : Gajah\";\"JavaScript : Huruf JS\"\n";
      
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'template_import_soal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template CSV Excel berhasil diunduh!');
  };

  const isWordFile = file?.name.endsWith('.docx');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-[#070a13]/85 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl transition"
        >
          <X className="h-5 w-5" />
        </button>
        
        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Impor Bank Soal</h2>
            <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">Mendukung dokumen Microsoft Word (.docx) dan Excel Spreadsheet (.csv)</p>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex bg-slate-200/60 dark:bg-white/5 p-1 rounded-2xl my-3 text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('word')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'word'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-300" />
            <span>Format Microsoft Word (.docx)</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">Direkomendasikan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'excel'
                ? 'bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
            <span>Format Excel / CSV</span>
          </button>
        </div>

        {/* Tab 1: Panduan Format Word */}
        {activeTab === 'word' && (
          <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 rounded-2xl text-xs text-slate-700 dark:text-gray-300 space-y-2 shrink-0 overflow-y-auto max-h-44">
            <div className="flex items-center justify-between font-bold text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Panduan Format Dokumen Word (.docx):
              </span>
              <button
                type="button"
                onClick={downloadWordTemplate}
                disabled={downloadingWord}
                className="text-[11px] text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-lg font-bold"
              >
                <Download className="h-3 w-3" />
                {downloadingWord ? 'Mengunduh...' : 'Unduh Template Word (.docx)'}
              </button>
            </div>
            <div className="font-mono text-[11px] bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 text-slate-700 dark:text-gray-300 space-y-1">
              <p className="text-slate-900 dark:text-white font-bold">1. Berapakah hasil dari 15 + 27 ?</p>
              <p className="pl-3 text-slate-600 dark:text-gray-400">A. 40</p>
              <p className="pl-3 text-slate-600 dark:text-gray-400">B. 42</p>
              <p className="pl-3 text-slate-600 dark:text-gray-400">C. 45</p>
              <p className="pl-3 font-bold text-emerald-600 dark:text-emerald-400">KUNCI: B</p>
              <p className="pl-3 text-slate-500 dark:text-gray-400 italic">PEMBAHASAN: 15 + 27 = 42.</p>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-tight">
              • Tipe lain didukung: <span className="font-mono font-bold text-slate-800 dark:text-gray-200">TIPE: pilihan_ganda_kompleks</span> (kunci: A, B), <span className="font-mono font-bold text-slate-800 dark:text-gray-200">TIPE: benar_salah</span>, <span className="font-mono font-bold text-slate-800 dark:text-gray-200">TIPE: essay</span>, dan <span className="font-mono font-bold text-slate-800 dark:text-gray-200">TIPE: menjodohkan</span> (<span className="font-mono">PASANGAN: Kiri : Kanan</span>).
            </p>
          </div>
        )}

        {/* Tab 2: Panduan Format Excel */}
        {activeTab === 'excel' && (
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-xs text-slate-700 dark:text-gray-300 space-y-2 shrink-0 overflow-y-auto max-h-44">
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Table className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Panduan Kolom Spreadsheet Excel (.csv):
              </span>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="text-[11px] text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-lg font-bold"
              >
                <Download className="h-3 w-3" />
                Unduh Template Excel (.csv)
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-gray-400">
              <div>• <strong className="text-slate-900 dark:text-gray-200">soal</strong>: Teks butir pertanyaan</div>
              <div>• <strong className="text-slate-900 dark:text-gray-200">tipe_soal</strong>: pilihan_ganda / essay / dll</div>
              <div>• <strong className="text-slate-900 dark:text-gray-200">pilihan_a s/d e</strong>: Kolom opsi</div>
              <div>• <strong className="text-slate-900 dark:text-gray-200">kunci_jawaban</strong>: Huruf kunci (A / A,B)</div>
              <div>• <strong className="text-slate-900 dark:text-gray-200">pasangan_menjodohkan</strong>: Kiri : Kanan</div>
              <div>• <strong className="text-slate-900 dark:text-gray-200">pembahasan</strong>: Penjelasan materi</div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="my-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs shrink-0 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="overflow-hidden">
              <span className="font-bold block">{error}</span>
              {rowErrors.length > 0 && (
                <ul className="list-disc pl-4 mt-1 space-y-0.5 max-h-20 overflow-y-auto font-medium">
                  {rowErrors.map((err, idx) => (
                    <li key={idx} className="text-rose-600 dark:text-rose-400">{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Form Upload Area */}
        <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col min-h-0 mt-2">
          <div className={`border-2 border-dashed transition-all rounded-3xl p-5 text-center flex flex-col items-center justify-center cursor-pointer relative ${
            file 
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' 
              : 'border-slate-300 dark:border-white/10 hover:border-indigo-500/60 bg-slate-50 dark:bg-white/[0.01]'
          }`}>
            <input
              type="file"
              accept=".docx,.csv,.xlsx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
              onChange={handleFileChange}
              required
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex flex-col items-center space-y-1">
                <div className={`p-3 rounded-2xl ${isWordFile ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                  {isWordFile ? <FileText className="h-8 w-8" /> : <Table className="h-8 w-8" />}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm mt-1">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-medium">
                  <span className="font-mono">{(file.size / 1024).toFixed(2)} KB</span>
                  <span>•</span>
                  <span className={`font-bold ${isWordFile ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isWordFile ? 'Dokumen Word (.docx)' : 'Berkas Spreadsheet (.csv)'}
                  </span>
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-8 w-8 text-slate-400 dark:text-gray-400 mx-auto mb-1.5" />
                <p className="text-sm text-slate-800 dark:text-gray-200 font-bold">Klik atau seret file Word / Excel ke sini</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Mendukung berkas <strong className="text-blue-600 dark:text-blue-400">.docx</strong> (Microsoft Word) dan <strong className="text-emerald-600 dark:text-emerald-400">.csv</strong> (Excel)</p>
              </div>
            )}
          </div>

          {/* Quick Download Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100/70 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">Unduh Template Siap Pakai:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadWordTemplate}
                disabled={downloadingWord}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Template Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Table className="h-3.5 w-3.5" />
                <span>Template Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-white/5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition shadow-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center disabled:opacity-50 shadow-lg shadow-indigo-600/30"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <span>Mulai Impor Soal</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
