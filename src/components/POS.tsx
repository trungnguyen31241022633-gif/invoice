import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  LogOut,
  History,
  Download,
  Printer,
  CheckCircle2,
  X,
  FileText,
  Settings,
  Save,
  Edit2,
  FileSpreadsheet,
  Menu,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PRODUCTS } from '../constants';
import { Product, CartItem, Invoice as IInvoice, InvoiceStatus } from '../types';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { toPng } from 'html-to-image';
import Invoice from './Invoice';

interface POSProps {
  onLogout: () => void;
  username: string;
}

export default function POS({ onLogout, username }: POSProps) {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('app_products');
    return saved ? JSON.parse(saved) : PRODUCTS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(`cart_${username}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<IInvoice[]>(() => {
    const saved = localStorage.getItem('history_shared');
    return saved ? JSON.parse(saved) : [];
  });

  const isGuest = username === 'guest';
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [search, setSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminAction, setAdminAction] = useState<{ type: string; payload: any } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  // New product form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Edit product state
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('app_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`cart_${username}`, JSON.stringify(cart));
  }, [cart, username]);

  useEffect(() => {
    localStorage.setItem('history_shared', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'history_shared' && e.newValue) {
        setHistory(JSON.parse(e.newValue));
      }
      if (e.key === 'app_products' && e.newValue) {
        setProducts(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const filteredProducts = products.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.code === updatedProduct.code ? updatedProduct : p));
    setEditingProduct(null);
    setEditName('');
    setEditPrice('');
  };

  const handleAddProduct = () => {
    if (!newCode || !newName || !newPrice) return;
    if (products.some(p => p.code === newCode)) {
      alert('Mã hàng đã tồn tại!');
      return;
    }
    setProducts([...products, { code: newCode.toUpperCase(), name: newName, price: Number(newPrice) }]);
    setNewCode('');
    setNewName('');
    setNewPrice('');
  };

  const handleDeleteProduct = (code: string) => {
    setConfirmDialog({
      show: true,
      title: 'Xóa sản phẩm',
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này?',
      onConfirm: () => {
        setProducts(products.filter(p => p.code !== code));
        setConfirmDialog(null);
      }
    });
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      product: selectedProduct,
      quantity,
      note
    };
    setCart([...cart, newItem]);
    setSelectedProduct(null);
    setQuantity(1);
    setNote('');
    setMobileTab('cart');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const saveInvoice = () => {
    if (cart.length === 0) return;
    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newInvoice: IInvoice = {
      id,
      customerName,
      items: [...cart],
      total,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    setHistory([newInvoice, ...history]);
    setLastSavedId(id);
    setCart([]);
    setCustomerName('');
    setShowPreview(false);
    setShowSuccess(true);
    setMobileTab('products');
  };

  const updateInvoiceStatus = (id: string, newStatus: InvoiceStatus) => {
    if (newStatus === 'CANCELLED') {
      setAdminAction({ type: 'STATUS_CANCEL', payload: { id } });
      setShowAdminConfirm(true);
      return;
    }
    setHistory(history.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
  };

  const handleAdminVerify = () => {
    if (adminPassword === '123') {
      if (adminAction?.type === 'STATUS_CANCEL') {
        const { id } = adminAction.payload;
        setHistory(history.map(inv => inv.id === id ? { ...inv, status: 'CANCELLED' } : inv));
      }
      setShowAdminConfirm(false);
      setAdminPassword('');
      setAdminError('');
      setAdminAction(null);
    } else {
      setAdminError('Mã admin không chính xác!');
    }
  };

  const deleteInvoice = (id: string) => {
    setConfirmDialog({
      show: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa hóa đơn này khỏi lịch sử?',
      onConfirm: () => {
        setHistory(history.filter(inv => inv.id !== id));
        setConfirmDialog(null);
      }
    });
  };

  const editHistoryInvoice = (invoice: IInvoice) => {
    const doEdit = () => {
      setCart(invoice.items);
      setCustomerName(invoice.customerName || '');
      setShowHistory(false);
      setConfirmDialog(null);
    };

    if (cart.length > 0) {
      setConfirmDialog({
        show: true,
        title: 'Cảnh báo giỏ hàng',
        message: 'Hành động này sẽ thay thế các sản phẩm hiện có trong giỏ hàng. Bạn có muốn tiếp tục?',
        onConfirm: doEdit
      });
      return;
    }
    doEdit();
  };

  const downloadImage = async () => {
    if (invoiceRef.current === null) return;
    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `hoa-don-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Không thể xuất ảnh', err);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  // Excel export: all non-cancelled invoices
  const exportToExcel = () => {
    const activeInvoices = history.filter(inv => inv.status !== 'CANCELLED');
    if (activeInvoices.length === 0) {
      alert('Không có hóa đơn nào để xuất!');
      return;
    }

    // Flatten all items across all invoices
    const rows: any[] = [];
    activeInvoices.forEach(inv => {
      inv.items.forEach((item, idx) => {
        rows.push({
          'Mã HĐ': idx === 0 ? `#${inv.id}` : '',
          'Ngày tạo': idx === 0 ? new Date(inv.createdAt).toLocaleString('vi-VN') : '',
          'Khách hàng': idx === 0 ? (inv.customerName || 'Khách hàng lẻ') : '',
          'Trạng thái': idx === 0 ? (inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán') : '',
          'Mã hàng': item.product.code,
          'Tên sản phẩm': item.product.name,
          'Số lượng': item.quantity,
          'Đơn giá (VND)': item.product.price,
          'Thành tiền (VND)': item.product.price * item.quantity,
          'Ghi chú': item.note || '',
          'Tổng HĐ (VND)': idx === 0 ? inv.total : '',
        });
      });
      // blank separator row between invoices
      rows.push({});
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 16 },
      { wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 16 },
      { wch: 18 }, { wch: 20 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');

    // Summary sheet
    const summaryRows = activeInvoices.map(inv => ({
      'Mã HĐ': `#${inv.id}`,
      'Ngày tạo': new Date(inv.createdAt).toLocaleString('vi-VN'),
      'Khách hàng': inv.customerName || 'Khách hàng lẻ',
      'Số mặt hàng': inv.items.length,
      'Tổng tiền (VND)': inv.total,
      'Trạng thái': inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp');

    XLSX.writeFile(wb, `quickinvoice-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const currentPreviewInvoice: IInvoice = previewInvoiceId
    ? history.find(inv => inv.id === previewInvoiceId)!
    : {
        id: 'PREVIEW',
        customerName: customerName || 'Khách hàng lẻ',
        items: cart,
        total: total,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
            <ShoppingCart className="text-white h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-gray-800">QuickInvoice</h1>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <span className="hidden sm:block text-sm text-gray-600">
            Xin chào, <span className="font-semibold">{username}</span>
          </span>

          <button
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600 text-sm font-medium"
          >
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Lịch sử</span>
          </button>

          {!isGuest && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-1.5 text-gray-600 text-sm font-medium"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Dữ liệu</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 text-red-600 text-sm font-medium"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      {!isGuest && (
        <div className="lg:hidden bg-white border-b border-gray-200 flex sticky top-[57px] z-10">
          <button
            onClick={() => setMobileTab('products')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2",
              mobileTab === 'products'
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <Search className="h-4 w-4" />
            Chọn hàng
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={cn(
              "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2",
              mobileTab === 'cart'
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            Giỏ hàng
            {cart.length > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      )}

      <main className="flex-1 p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Product Selection */}
        {!isGuest ? (
          <>
            {/* Products Panel */}
            <div className={cn(
              "lg:col-span-2 space-y-4 sm:space-y-6",
              "lg:block",
              mobileTab === 'products' ? "block" : "hidden"
            )}>
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  Chọn sản phẩm
                </h2>

                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã hoặc tên sản phẩm..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-h-[45vh] sm:max-h-[400px] overflow-y-auto pr-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.code}
                      onClick={() => {
                        setSelectedProduct(product);
                        setQuantity(1);
                        setNote('');
                      }}
                      className={cn(
                        "p-3 sm:p-4 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[80px]",
                        selectedProduct?.code === product.code
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-100 bg-gray-50 hover:border-blue-300 hover:shadow-sm"
                      )}
                    >
                      <div>
                        <span className="text-xs font-bold text-blue-600 block mb-1 uppercase tracking-wider">{product.code}</span>
                        <span className="text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{product.name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 mt-2 block">{formatCurrency(product.price)}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-4 py-10 text-center text-gray-400 text-sm">
                      Không tìm thấy sản phẩm
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cart + Checkout Panel */}
            <div className={cn(
              "lg:col-span-1 lg:block space-y-4 sm:space-y-6",
              mobileTab === 'cart' ? "block" : "hidden"
            )}>
              {/* Cart table */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    Giỏ hàng
                  </span>
                  <span className="text-xs font-normal text-gray-400">{cart.length} mặt hàng</span>
                </h2>

                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="w-full min-w-[320px] text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-2 px-2">Sản phẩm</th>
                        <th className="pb-2 px-2 text-center">SL</th>
                        <th className="pb-2 px-2 text-right">Tổng</th>
                        <th className="pb-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence>
                        {cart.map(item => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <div className="font-medium text-gray-900 text-xs sm:text-sm leading-tight">{item.product.name}</div>
                              <div className="text-xs text-gray-400 uppercase">{item.product.code}{item.note && ` | ${item.note}`}</div>
                            </td>
                            <td className="py-3 px-2 text-center font-medium">{item.quantity}</td>
                            <td className="py-3 px-2 text-right font-bold text-gray-900 whitespace-nowrap">
                              {formatCurrency(item.product.price * item.quantity)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {cart.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-gray-400 text-sm italic">
                            Chưa có sản phẩm nào
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Checkout */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">Khách hàng</label>
                    <input
                      type="text"
                      placeholder="Tên khách hàng (không bắt buộc)"
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="text-gray-500 text-sm">Tổng tiền:</span>
                    <span className="text-xl sm:text-2xl font-black text-gray-900">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setShowPreview(true)}
                    disabled={cart.length === 0}
                    className="py-3.5 rounded-xl bg-gray-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Xem hóa đơn
                  </button>

                  <button
                    onClick={saveInvoice}
                    disabled={cart.length === 0}
                    className="py-3.5 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-100 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Hoàn tất & Lưu
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center bg-white/50 rounded-2xl border border-dashed border-gray-200 min-h-[300px]">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Chế độ Viewer</h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm mt-2">Bạn đang đăng nhập với tài khoản khách. Xem lịch sử để theo dõi các đơn hàng.</p>
              <button
                onClick={() => setShowHistory(true)}
                className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 text-sm"
              >
                Mở lịch sử ngay
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ============ HISTORY MODAL ============ */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white w-full sm:max-w-4xl sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col relative"
              style={{ maxHeight: '92vh' }}
            >
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Lịch sử hóa đơn
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                    title="Xuất Excel"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Xuất Excel</span>
                  </button>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setHistoryTab('ACTIVE')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                        historyTab === 'ACTIVE' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                      )}
                    >
                      Đơn hàng
                    </button>
                    <button
                      onClick={() => setHistoryTab('CANCELLED')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all",
                        historyTab === 'CANCELLED' ? "bg-white text-red-600 shadow-sm" : "text-gray-500"
                      )}
                    >
                      Đã hủy
                    </button>
                  </div>
                  <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {history.filter(inv => historyTab === 'ACTIVE' ? inv.status !== 'CANCELLED' : inv.status === 'CANCELLED').length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Chưa có hóa đơn nào trong mục này</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {history
                      .filter(inv => historyTab === 'ACTIVE' ? inv.status !== 'CANCELLED' : inv.status === 'CANCELLED')
                      .map((inv) => (
                        <div key={inv.id} className="border border-gray-100 p-4 rounded-xl hover:shadow-md transition-all relative">
                          <button
                            onClick={() => {
                              setPreviewInvoiceId(inv.id);
                              setShowPreview(true);
                            }}
                            className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                            title="Xem chi tiết"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <div className="flex justify-between items-start mb-3 pr-6">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-bold text-blue-600 uppercase">#{inv.id}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  inv.status === 'PAID' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                                  inv.status === 'CANCELLED' ? "text-red-600 bg-red-50 border-red-100" :
                                  "text-amber-600 bg-amber-50 border-amber-100"
                                )}>
                                  {inv.status === 'PAID' ? 'Đã thanh toán' :
                                   inv.status === 'CANCELLED' ? 'Đã hủy đơn' : 'Chưa thanh toán'}
                                </span>
                              </div>
                              <span className="font-semibold text-gray-900 text-sm line-clamp-1">{inv.customerName || 'Khách hàng lẻ'}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(inv.total)}</span>
                              {!isGuest && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteInvoice(inv.id); }}
                                  className="block mt-1 text-[10px] text-red-400 hover:text-red-600 underline ml-auto"
                                >
                                  Xóa đơn
                                </button>
                              )}
                            </div>
                          </div>

                          {!isGuest && (
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              {(['PENDING', 'PAID', 'CANCELLED'] as InvoiceStatus[]).map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateInvoiceStatus(inv.id, s)}
                                  className={cn(
                                    "text-[10px] py-1.5 rounded-lg transition-all font-bold border",
                                    inv.status === s
                                      ? s === 'PAID' ? "bg-emerald-600 text-white border-emerald-600"
                                        : s === 'CANCELLED' ? "bg-red-600 text-white border-red-600"
                                        : "bg-amber-500 text-white border-amber-500"
                                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                                  )}
                                >
                                  {s === 'PENDING' ? 'Chưa TT' : s === 'PAID' ? 'Đã TT' : 'Hủy đơn'}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                            <span className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleString('vi-VN')}</span>
                            <div className="flex items-center gap-2">
                              {!isGuest && (
                                <button
                                  onClick={() => editHistoryInvoice(inv)}
                                  className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Sửa
                                </button>
                              )}
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{inv.items.length} mặt hàng</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ INVOICE PREVIEW MODAL ============ */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowPreview(false); setPreviewInvoiceId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-gray-100 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl relative flex flex-col"
              style={{ maxHeight: '95vh' }}
            >
              {/* Action bar */}
              <div className="flex items-center gap-2 p-3 sm:p-4 print:hidden flex-wrap">
                <button
                  onClick={downloadImage}
                  className="flex items-center gap-1.5 bg-gray-900 text-white px-3 sm:px-4 py-2 rounded-xl hover:bg-black transition-all text-xs sm:text-sm font-bold"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Lưu ảnh
                </button>
                <button
                  onClick={printInvoice}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-xl hover:bg-blue-700 transition-all text-xs sm:text-sm font-bold"
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  In
                </button>
                {!previewInvoiceId && (
                  <button
                    onClick={saveInvoice}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all text-xs sm:text-sm font-bold ml-auto"
                  >
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Lưu đơn
                  </button>
                )}
                <button
                  onClick={() => { setShowPreview(false); setPreviewInvoiceId(null); }}
                  className="p-2 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all ml-auto sm:ml-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-3 sm:p-6">
                <Invoice
                  ref={invoiceRef}
                  items={currentPreviewInvoice.items}
                  customerName={currentPreviewInvoice.customerName}
                  invoiceId={currentPreviewInvoice.id === 'PREVIEW' ? Math.random().toString(36).substr(2, 6).toUpperCase() : currentPreviewInvoice.id}
                  date={currentPreviewInvoice.createdAt}
                  status={currentPreviewInvoice.status}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ QUICK ADD PRODUCT MODAL ============ */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl shadow-2xl p-5 sm:p-6 relative z-10"
            >
              {/* drag handle for mobile */}
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedProduct.code}</span>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">{selectedProduct.name}</h3>
                  <p className="text-sm font-semibold text-gray-400">{formatCurrency(selectedProduct.price)}</p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); addToCart(); }} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Số lượng</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      className="flex-1 h-12 text-center border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Ghi chú (nếu có)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: lấy nắp nhựa trắng..."
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Tạm tính:</span>
                  <span className="text-base font-bold text-gray-900">{formatCurrency(selectedProduct.price * quantity)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 text-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm vào đơn
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ SETTINGS MODAL ============ */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white w-full sm:max-w-4xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col relative"
              style={{ maxHeight: '92vh' }}
            >
              <div className="px-5 sm:px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 sm:gap-3">
                    <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                    Quản lý danh mục hàng
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">Chỉnh sửa giá và sản phẩm trong hệ thống</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-2xl transition-all">
                  <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
                {/* Add new product */}
                <div className="bg-blue-50/50 p-4 sm:p-6 rounded-2xl border border-blue-100">
                  <h3 className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-widest mb-3 sm:mb-4">Thêm sản phẩm mới</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Mã hàng (VD: 60N)"
                      className="px-4 py-3 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 uppercase text-sm"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Tên sản phẩm"
                      className="px-4 py-3 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Giá (VND)"
                        className="flex-1 px-4 py-3 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                      />
                      <button
                        onClick={handleAddProduct}
                        className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product list */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Danh sách hiện tại</h3>
                    <span className="text-xs text-gray-400">{products.length} sản phẩm</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {products.map((p) => (
                      <div key={p.code} className="flex items-center justify-between p-3 sm:p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all gap-2">
                        <span className="w-14 sm:w-16 text-xs font-black text-blue-600 uppercase bg-blue-50 p-1.5 rounded-lg text-center flex-shrink-0">
                          {p.code}
                        </span>

                        {editingProduct?.code === p.code ? (
                          <div className="flex gap-2 flex-1 min-w-0">
                            <input
                              type="text"
                              defaultValue={editingProduct.name}
                              className="flex-1 px-3 py-1.5 border border-blue-200 rounded-lg text-xs sm:text-sm bg-blue-50/30 outline-none min-w-0"
                              id={`edit-name-${p.code}`}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                            <input
                              type="number"
                              defaultValue={editingProduct.price}
                              className="w-20 sm:w-24 px-3 py-1.5 border border-blue-200 rounded-lg text-xs sm:text-sm bg-blue-50/30 outline-none"
                              id={`edit-price-${p.code}`}
                              onChange={(e) => setEditPrice(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-400 font-bold">{formatCurrency(p.price)}</div>
                          </div>
                        )}

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {editingProduct?.code === p.code ? (
                            <>
                              <button
                                onClick={() => {
                                  const nameEl = document.getElementById(`edit-name-${p.code}`) as HTMLInputElement;
                                  const priceEl = document.getElementById(`edit-price-${p.code}`) as HTMLInputElement;
                                  handleUpdateProduct({ code: p.code, name: nameEl.value, price: Number(priceEl.value) });
                                }}
                                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="p-2 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.code)}
                                className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 text-center">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-10 sm:px-12 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all text-sm"
                >
                  Xong
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ SUCCESS MODAL ============ */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccess(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative z-10"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Đã lưu thành công!</h2>
              <p className="text-gray-500 mb-6 text-sm">Mã hóa đơn của bạn là:</p>
              <div className="bg-gray-50 py-4 px-6 rounded-2xl mb-8 border border-gray-100">
                <span className="text-3xl font-black text-blue-600 tracking-wider">#{lastSavedId}</span>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ ADMIN CONFIRM MODAL ============ */}
      <AnimatePresence>
        {showAdminConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAdminConfirm(false); setAdminPassword(''); }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-xs w-full relative z-10"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xác thực Admin</h3>
              <p className="text-sm text-gray-500 mb-4">Nhập mã admin để thực hiện hủy đơn:</p>
              <input
                type="password"
                className={cn(
                  "w-full px-4 py-3 border rounded-xl mb-1 focus:ring-2 outline-none transition-all text-sm",
                  adminError ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-blue-500"
                )}
                placeholder="Nhập mã admin..."
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdminVerify()}
              />
              {adminError && <p className="text-red-500 text-xs mb-3 font-medium">{adminError}</p>}
              <div className={cn("flex gap-2", adminError ? "mt-0" : "mt-4")}>
                <button
                  onClick={() => { setShowAdminConfirm(false); setAdminPassword(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAdminVerify}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 text-sm"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ CONFIRM DIALOG ============ */}
      <AnimatePresence>
        {confirmDialog?.show && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full relative z-10"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-gray-500 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors text-sm"
                >
                  Trở lại
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors text-sm"
                >
                  Đồng ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-template, #invoice-template * { visibility: visible; }
          #invoice-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
