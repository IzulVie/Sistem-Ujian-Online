import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/client';
import { Plus, Trash2, Upload, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface QuestionFormProps {
  questionId?: number | null;
  packageId?: number | null;
  defaultSubjectId?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface OptionInput {
  id?: number;
  content: string;
  is_correct: boolean;
  order: number;
  mediaFile?: File | null;
  media_url?: string | null;
}

interface MatchingPairInput {
  left_item: string;
  right_item: string;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({ questionId, packageId, defaultSubjectId, onSuccess, onCancel }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(defaultSubjectId ? defaultSubjectId.toString() : '');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [type, setType] = useState<'multiple_choice_single' | 'multiple_choice_multi' | 'essay' | 'true_false' | 'matching'>('multiple_choice_single');
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  
  // Media files
  const [questionMedia, setQuestionMedia] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);

  // Options for MCQ / True False
  const [options, setOptions] = useState<OptionInput[]>([
    { content: '', is_correct: false, order: 0 },
    { content: '', is_correct: false, order: 1 }
  ]);

  // Matching Pairs
  const [matchingPairs, setMatchingPairs] = useState<MatchingPairInput[]>([
    { left_item: '', right_item: '' }
  ]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await apiClient.get('/teacher/subjects');
        setSubjects(response.data);
        if (response.data.length > 0 && !questionId) {
          setSubjectId(response.data[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };

    const loadQuestionData = async () => {
      if (!questionId) return;
      setLoading(true);
      try {
        const response = await apiClient.get(`/teacher/questions/${questionId}`);
        const q = response.data;
        
        setSubjectId(q.subject_id.toString());
        setTopic(q.topic);
        setDifficulty(q.difficulty);
        setType(q.type);
        setContent(q.content);
        setExplanation(q.explanation || '');
        setQuestionMediaUrl(q.media_url);

        if (q.type === 'multiple_choice_single' || q.type === 'multiple_choice_multi' || q.type === 'true_false') {
          setOptions(q.options.map((opt: any) => ({
            id: opt.id,
            content: opt.content,
            is_correct: opt.is_correct,
            order: opt.order,
            media_url: opt.media_url
          })));
        } else if (q.type === 'matching') {
          setMatchingPairs(q.matching_pairs.map((pair: any) => ({
            left_item: pair.left_item,
            right_item: pair.right_item
          })));
        }
      } catch (err) {
        console.error('Failed to load question:', err);
        setError('Gagal memuat detail soal.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects().then(() => loadQuestionData());
  }, [questionId]);

  // Handle MCQ Options CRUD
  const addOption = () => {
    setOptions([...options, { content: '', is_correct: false, order: options.length }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx).map((opt, i) => ({ ...opt, order: i })));
  };

  const handleOptionChange = (idx: number, field: keyof OptionInput, value: any) => {
    const updated = [...options];
    
    if (field === 'is_correct' && type === 'multiple_choice_single') {
      // Uncheck all other options
      updated.forEach((opt, i) => {
        opt.is_correct = i === idx;
      });
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    
    setOptions(updated);
  };

  const handleOptionFileChange = (idx: number, file: File | null) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], mediaFile: file };
    setOptions(updated);
  };

  // Handle Matching Pairs CRUD
  const addMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { left_item: '', right_item: '' }]);
  };

  const removeMatchingPair = (idx: number) => {
    setMatchingPairs(matchingPairs.filter((_, i) => i !== idx));
  };

  const handleMatchingChange = (idx: number, field: keyof MatchingPairInput, value: string) => {
    const updated = [...matchingPairs];
    updated[idx] = { ...updated[idx], [field]: value };
    setMatchingPairs(updated);
  };

  // Adjust options automatically when type changes
  const handleTypeChange = (newType: any) => {
    setType(newType);
    if (newType === 'true_false') {
      setOptions([
        { content: 'Benar', is_correct: true, order: 0 },
        { content: 'Salah', is_correct: false, order: 1 }
      ]);
    } else if (newType === 'multiple_choice_single' || newType === 'multiple_choice_multi') {
      setOptions([
        { content: '', is_correct: false, order: 0 },
        { content: '', is_correct: false, order: 1 },
        { content: '', is_correct: false, order: 2 },
        { content: '', is_correct: false, order: 3 }
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    if (packageId) {
      formData.append('package_id', packageId.toString());
    }
    formData.append('subject_id', subjectId);
    formData.append('topic', topic);
    formData.append('difficulty', difficulty);
    formData.append('type', type);
    formData.append('content', content);
    formData.append('explanation', explanation);

    if (questionMedia) {
      formData.append('media', questionMedia);
    }

    // Validate and append Options
    if (type === 'multiple_choice_single' || type === 'multiple_choice_multi' || type === 'true_false') {
      const correctCount = options.filter(o => o.is_correct).length;
      if (correctCount === 0) {
        setError('Pilih minimal satu opsi sebagai jawaban yang benar.');
        setLoading(false);
        return;
      }
      
      options.forEach((opt, idx) => {
        formData.append(`options[${idx}][content]`, opt.content);
        formData.append(`options[${idx}][is_correct]`, opt.is_correct ? '1' : '0');
        formData.append(`options[${idx}][order]`, opt.order.toString());
        if (opt.mediaFile) {
          formData.append(`options[${idx}][media]`, opt.mediaFile);
        } else if (opt.media_url) {
          formData.append(`options[${idx}][media_url]`, opt.media_url);
        }
      });
    }

    // Append Matching Pairs
    if (type === 'matching') {
      matchingPairs.forEach((pair, idx) => {
        formData.append(`matching_pairs[${idx}][left_item]`, pair.left_item);
        formData.append(`matching_pairs[${idx}][right_item]`, pair.right_item);
      });
    }

    try {
      if (questionId) {
        // Method spoofing for PUT request with multipart/form-data
        formData.append('_method', 'PUT');
        await apiClient.post(`/teacher/questions/${questionId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await apiClient.post('/teacher/questions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan soal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl relative shadow-xl">
      <h2 className="text-xl font-bold text-white mb-6">
        {questionId ? 'Edit Soal Ujian' : 'Buat Soal Ujian Baru'}
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-sm font-semibold flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Mata Pelajaran
            </label>
            <select
              value={subjectId}
              required
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Topik / Bab Soal
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Integral, Tenses, Listrik"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Tingkat Kesulitan
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
            >
              <option value="easy">Mudah</option>
              <option value="medium">Sedang</option>
              <option value="hard">Sulit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Tipe Soal
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="w-full px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
            >
              <option value="multiple_choice_single">Pilihan Ganda (Satu Jawaban)</option>
              <option value="multiple_choice_multi">Pilihan Ganda (Banyak Jawaban)</option>
              <option value="essay">Uraian / Essay</option>
              <option value="true_false">Benar / Salah</option>
              <option value="matching">Menjodohkan (Matching)</option>
            </select>
          </div>
        </div>

        {/* Question body content */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
              Pertanyaan / Isi Soal (Dukung rumus LaTeX menggunakan $$...$$)
            </label>
          </div>
          <textarea
            required
            rows={5}
            placeholder="Ketik pertanyaan di sini. Contoh rumus matematika: $$f(x) = \sqrt{x^2 + 1}$$"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 glass-input rounded-2xl text-slate-900 dark:text-white text-sm font-medium"
          />
        </div>

        {/* Question Image Attachment */}
        <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
          <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            Lampiran Gambar Soal (Opsional)
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center justify-center p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 dark:text-gray-400 shrink-0 w-24 h-24 overflow-hidden relative shadow-xs">
              {questionMediaUrl ? (
                <img src={questionMediaUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : questionMedia ? (
                <img src={URL.createObjectURL(questionMedia)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setQuestionMedia(e.target.files[0]);
                    setQuestionMediaUrl(null);
                  }
                }}
                className="block w-full text-sm text-slate-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-100 dark:file:bg-indigo-600/20 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-200 dark:hover:file:bg-indigo-600/30 file:cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 font-medium">Batas file gambar maksimal 2 MB.</p>
            </div>
          </div>
        </div>

        {/* MCQ/TrueFalse options fields */}
        {(type === 'multiple_choice_single' || type === 'multiple_choice_multi' || type === 'true_false') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Daftar Pilihan Jawaban</h3>
              {type !== 'true_false' && (
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-500/25 transition active:scale-95 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Pilihan</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl">
                  
                  {/* Radio/Checkbox for correctness */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type={type === 'multiple_choice_multi' ? 'checkbox' : 'radio'}
                      name="correct_option"
                      checked={opt.is_correct}
                      onChange={(e) => handleOptionChange(idx, 'is_correct', e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 dark:text-gray-400 font-bold">Opsi {idx + 1}</span>
                  </div>

                  {/* Option content */}
                  <input
                    type="text"
                    required
                    disabled={type === 'true_false'}
                    placeholder={`Masukkan teks pilihan jawaban ${idx + 1}`}
                    value={opt.content}
                    onChange={(e) => handleOptionChange(idx, 'content', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />

                  {/* Option Image upload */}
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleOptionFileChange(idx, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id={`opt-file-${idx}`}
                    />
                    <label
                      htmlFor={`opt-file-${idx}`}
                      className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-gray-400 rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{opt.mediaFile ? 'Terganti' : opt.media_url ? 'Ada Gambar' : 'Gambar'}</span>
                    </label>
                  </div>

                  {/* Delete option */}
                  {type !== 'true_false' && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matching pairs fields */}
        {type === 'matching' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Daftar Pasangan (Menjodohkan)</h3>
              <button
                type="button"
                onClick={addMatchingPair}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-500/25 transition active:scale-95 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Pasangan</span>
              </button>
            </div>

            <div className="space-y-3">
              {matchingPairs.map((pair, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl">
                  <input
                    type="text"
                    required
                    placeholder="Baris Kiri (e.g. Jakarta)"
                    value={pair.left_item}
                    onChange={(e) => handleMatchingChange(idx, 'left_item', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                  <span className="text-slate-400 dark:text-gray-500 text-xs font-bold">⇔</span>
                  <input
                    type="text"
                    required
                    placeholder="Baris Kanan (e.g. Indonesia)"
                    value={pair.right_item}
                    onChange={(e) => handleMatchingChange(idx, 'right_item', e.target.value)}
                    className="flex-1 px-3.5 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                  {matchingPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMatchingPair(idx)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation / Pembahasan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Pembahasan / Kunci Jawaban Uraian (Dukung LaTeX $$...$$)
          </label>
          <textarea
            rows={3}
            placeholder="Masukkan pembahasan soal atau panduan penilaian esai di sini..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full px-4 py-3 glass-input rounded-2xl text-slate-900 dark:text-white text-sm font-medium"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold text-sm rounded-xl transition shadow-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition flex justify-center items-center shadow-lg shadow-indigo-600/30"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <span>Simpan Soal</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
