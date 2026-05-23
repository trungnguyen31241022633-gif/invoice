import React from 'react';
import { CartItem, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

interface InvoiceProps {
  items: CartItem[];
  customerName?: string;
  invoiceId: string;
  date: string;
  status?: InvoiceStatus;
}

export default React.forwardRef<HTMLDivElement, InvoiceProps>(function Invoice(
  { items, customerName, invoiceId, date, status = 'PENDING' },
  ref
) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const StatusBadge = () => {
    switch (status) {
      case 'PAID':
        return (
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <CheckCircle className="h-3 w-3" />
            Đã thanh toán
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase bg-red-50 px-3 py-1 rounded-full border border-red-100">
            <XCircle className="h-3 w-3" />
            Đã hủy đơn
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-amber-600 font-bold text-xs uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            <Clock className="h-3 w-3" />
            Chưa thanh toán
          </div>
        );
    }
  };

  return (
    <div
      ref={ref}
      className="bg-white p-6 sm:p-8 max-w-2xl mx-auto shadow-lg border border-gray-100 print:shadow-none print:border-none relative"
      id="invoice-template"
    >
      <div className="absolute top-6 right-6 print:block hidden">
        <StatusBadge />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 mb-6 border-b-2 border-gray-100">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 uppercase flex items-center gap-2">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 print:hidden" />
              Hóa Đơn Bán Hàng
            </h1>
            <div className="print:hidden">
              <StatusBadge />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Mã HĐ: #{invoiceId}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-semibold text-gray-700 text-sm sm:text-base">Cửa hàng Chai Nhựa & Thủy Tinh</p>
          <p className="text-xs text-gray-500">Ngày xuất: {formatDate(date)}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thông tin khách hàng</h3>
        <p className="text-lg font-medium text-gray-900">{customerName || 'Khách hàng lẻ'}</p>
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[480px] mb-8 px-2">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Mã hàng</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-600">Tên sản phẩm</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">SL</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">Đơn giá</th>
              <th className="py-2 px-2 text-xs font-semibold text-gray-600 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 px-2 text-xs text-gray-800 uppercase">{item.product.code}</td>
                <td className="py-3 px-2 text-xs text-gray-800">
                  <div>{item.product.name}</div>
                  {item.note && <div className="text-xs text-gray-500 italic">Ghi chú: {item.note}</div>}
                </td>
                <td className="py-3 px-2 text-xs text-gray-800 text-right">{item.quantity}</td>
                <td className="py-3 px-2 text-xs text-gray-800 text-right">{formatCurrency(item.product.price)}</td>
                <td className="py-3 px-2 text-xs font-medium text-gray-900 text-right">
                  {formatCurrency(item.product.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="w-full sm:w-1/2">
          <div className="flex justify-between py-2 border-t border-gray-200">
            <span className="text-gray-600 font-semibold">Tổng cộng:</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 text-center text-gray-400 text-xs">
        <p>Cảm ơn quý khách đã tin tưởng và sử dụng sản phẩm của chúng tôi!</p>
        <p className="mt-1">Hóa đơn này có giá trị xác nhận giao dịch.</p>
      </div>
    </div>
  );
});
