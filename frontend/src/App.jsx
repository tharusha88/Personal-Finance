import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, ReceiptText, Users, Plus, Bell, ArrowUpRight, ArrowDownRight, ChevronRight, Wallet, X, CheckCircle, Trash2, Download, Search, Target, Check, ImagePlus, MinusCircle, Printer, RotateCcw, UserPlus, Star, MapPin, Calendar, Phone, Activity, Minus, CreditCard, TrendingUp, PieChart as PieChartIcon, Edit, AlertTriangle, Gift, Building2, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
// M-2: Centralized API base URL
const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const ACCOUNTS = ['Cash in Hand', 'Bank Account', 'COD Pending'];

  // L-1: Loading state for API calls
  const [isLoading, setIsLoading] = useState(true);

  // L-3: Toast timeout ref to prevent race conditions
  const toastTimeoutRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountName, setAccountName] = useState('Cash in Hand');

  // Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ fromAccount: 'Cash in Hand', toAccount: 'Bank Account', amount: '', description: '' });
  const [toast, setToast] = useState({ visible: false, message: '' });

  // L-3: Safe toast helper that cancels previous timeout
  const showToast = (message, duration = 3000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ visible: true, message });
    toastTimeoutRef.current = setTimeout(() => setToast({ visible: false, message: '' }), duration);
  };

  // Delete karanna ahan inna transaction eke ID eka save karaganna state eka
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Delete karanna ahan inna customer/client eke ID eka save karaganna state eka
  const [deleteCustomerConfirmId, setDeleteCustomerConfirmId] = useState(null);

  // Delete karanna ahan inna pending delivery/bill eke ID eka save karaganna state eka
  const [deletePendingBillConfirmId, setDeletePendingBillConfirmId] = useState(null);

  // Reprint karanna select karapu pending bill eke data save karana state eka
  const [reprintData, setReprintData] = useState(null);

  const [categorySelect, setCategorySelect] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'all'
  const [filterType, setFilterType] = useState('All'); // 'All', 'Income', 'Expense'
  const [searchQuery, setSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [walletFilter, setWalletFilter] = useState('Monthly');
  
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingAmount, setEditingAmount] = useState('');

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/transactions`);
      const result = await response.json();
      if (result.status === 'success') {
        setTransactions(result.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers`);
      const result = await response.json();
      if (result.status === 'success') {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const saveTransactionAmount = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(editingAmount) })
      });
      if (response.ok) {
        showToast("Amount updated successfully");
        setEditingTransactionId(null);
        fetchTransactions();
      } else {
        showToast("Failed to update amount");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchCustomers()]).finally(() => setIsLoading(false));
  }, []);

  const totalIncome = transactions
    .filter(tx => tx.type === 'Income' && tx.category !== 'Account Transfer')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'Expense' && tx.category !== 'Account Transfer')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const availableBalance = totalIncome - totalExpense;

  // Per-account net balance calculations
  const getAccountBalance = (accountLabel) => {
    const inc = transactions.filter(tx => tx.type === 'Income' && tx.account_name === accountLabel).reduce((s, tx) => s + tx.amount, 0);
    const exp = transactions.filter(tx => tx.type === 'Expense' && tx.account_name === accountLabel).reduce((s, tx) => s + tx.amount, 0);
    return inc - exp;
  };
  const cashBalance = getAccountBalance('Cash in Hand');
  const bankBalance = getAccountBalance('Bank Account');
  const codBalance = getAccountBalance('COD Pending');

  const incomeCategories = ["Cactus sale Online", "Cactus Sale Physical", "Scholarship", "Other"];
  const expenseCategories = ["Plants", "Plant Accessories", "Other"];

  const currentCategories = txType === 'Income' ? incomeCategories : expenseCategories;

  // Analytics Data Preparation (Aggregate by Date for the chart)
  const aggregatedData = {};
  [...transactions].reverse().forEach(tx => {
    if (tx.category === 'Account Transfer') return;
    const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!aggregatedData[dateStr]) {
      aggregatedData[dateStr] = { name: dateStr, Income: 0, Expense: 0 };
    }
    if (tx.type === 'Income') {
      aggregatedData[dateStr].Income += tx.amount;
    } else {
      aggregatedData[dateStr].Expense += tx.amount;
    }
  });
  // Take only the last 7 active days for a clean UI
  const chartData = Object.values(aggregatedData).slice(-7);

  // Custom Chart Tooltip components for premium UI
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl min-w-[120px]">
          <p className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm font-bold mt-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-zinc-300">{entry.name}</span>
              </div>
              <span className="text-white">Rs. {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom modal eken 'Delete' obuwama run wena function eka
  const executeDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const response = await fetch(`${API_BASE}/api/transactions/${deleteConfirmId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast("Transaction deleted successfully");
        fetchTransactions(); 
      } else {
        showToast("Failed to delete transaction");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
    
    // Wede iwara wunama delete popup eka wahanawa
    setDeleteConfirmId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalCategory = categorySelect === 'Other' ? customCategory.trim() : categorySelect;

    if (!amount || !finalCategory) {
      showToast("Please enter amount and category");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount: parseFloat(amount),
          category: finalCategory, 
          description: description,
          account_name: accountName
        }),
      });

      if (response.ok) {
        setAmount('');
        setCategorySelect('');
        setCustomCategory('');
        setDescription('');
        setTxType('Income');
        setAccountName('Cash in Hand');
        setIsModalOpen(false);
        
        showToast("Transaction saved successfully");
        
        fetchTransactions();
      } else {
        showToast("Failed to save transaction");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  const handleTransfer = async () => {
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      showToast("Please enter a valid transfer amount");
      return;
    }
    if (transferData.fromAccount === transferData.toAccount) {
      showToast("Source and destination accounts must differ");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: transferData.fromAccount,
          to_account: transferData.toAccount,
          amount: parseFloat(transferData.amount),
          description: transferData.description || null
        }),
      });
      if (response.ok) {
        showToast(`Transferred LKR ${parseFloat(transferData.amount).toLocaleString()} from ${transferData.fromAccount} to ${transferData.toAccount}`);
        setTransferData({ fromAccount: 'Cash in Hand', toAccount: 'Bank Account', amount: '', description: '' });
        setIsTransferModalOpen(false);
        fetchTransactions();
      } else {
        const err = await response.json();
        showToast(err.detail || "Transfer failed");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  const handleMonthEndSettlement = async () => {
    if (cashBalance <= 0) {
      showToast("No active cash balance to settle");
      return;
    }
    if (!window.confirm(`Are you sure you want to settle LKR ${cashBalance.toLocaleString()} to your Bank Account?`)) {
      return;
    }
    try {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const response = await fetch(`${API_BASE}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_account: 'Cash in Hand',
          to_account: 'Bank Account',
          amount: cashBalance,
          description: 'Month End Settlement',
          date: endOfMonth.toISOString()
        }),
      });
      if (response.ok) {
        showToast(`Month End Settlement of LKR ${cashBalance.toLocaleString()} successful!`);
        fetchTransactions();
      } else {
        const err = await response.json();
        showToast(err.detail || "Settlement failed");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleTypeChange = (newType) => {
    setTxType(newType);
    setCategorySelect('');
    setCustomCategory('');
  };
// Filter logic for the "See All" view
  const filteredTransactions = transactions.filter(tx => {
    const matchesType = filterType === 'All' || tx.type === filterType;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = tx.category.toLowerCase().includes(searchLower) || 
                          (tx.description && tx.description.toLowerCase().includes(searchLower)) || 
                          tx.amount.toString().includes(searchLower);
    return matchesType && matchesSearch;
  });

  const downloadCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ["Date", "Category", "Type", "Amount", "Description"];
    const csvRows = filteredTransactions.map(tx => 
      `${new Date(tx.date).toLocaleDateString()},"${tx.category}","${tx.type}",${tx.amount},"${tx.description || ''}"`
    );
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "blooming_barrels_transactions.csv");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Dashboard eke pennanna recent ma transactions 5k witharak ganna
  const recentTransactions = transactions.slice(0, 5);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState('All Time'); // 'All Time', 'This Month', 'Last 7 Days'

  // Monthly Target States & Logic
  const [monthlyTarget, setMonthlyTarget] = useState(() => Number(localStorage.getItem('monthlyTarget')) || 100000);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');

  // Monthly Expense Limit States
  const [monthlyExpenseLimit, setMonthlyExpenseLimit] = useState(() => Number(localStorage.getItem('monthlyExpenseLimit')) || 30000);
  const [isEditingExpenseLimit, setIsEditingExpenseLimit] = useState(false);
  const [tempExpenseLimit, setTempExpenseLimit] = useState('');

  // Notification panel open state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Dismissed notifications IDs (persisted)
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedNotifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentMonthIncome = transactions
    .filter(tx => tx.type === 'Income' && tx.category !== 'Account Transfer' && new Date(tx.date || Date.now()).getMonth() === new Date().getMonth() && new Date(tx.date || Date.now()).getFullYear() === new Date().getFullYear())
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonthExpense = transactions
    .filter(tx => tx.type === 'Expense' && tx.category !== 'Account Transfer' && new Date(tx.date || Date.now()).getMonth() === new Date().getMonth() && new Date(tx.date || Date.now()).getFullYear() === new Date().getFullYear())
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const targetProgress = monthlyTarget > 0 ? Math.min((currentMonthIncome / monthlyTarget) * 100, 100) : 0;
  const expenseLimitProgress = monthlyExpenseLimit > 0 ? Math.min((currentMonthExpense / monthlyExpenseLimit) * 100, 100) : 0;

  const incomeVsExpenseData = [
    { name: 'Income', amount: currentMonthIncome, fill: '#10b981' },
    { name: 'Expense', amount: currentMonthExpense, fill: '#f43f5e' }
  ];

  // Current Month Day-by-Day Revenue data
  const getCurrentMonthDailyRevenue = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyData = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateLabel = `${now.toLocaleString('default', { month: 'short' })} ${d}`;
      dailyData.push({ name: dateLabel, dayNum: d, Revenue: 0 });
    }
    
    transactions.forEach(tx => {
      if (tx.type !== 'Income') return;
      const txDate = new Date(tx.date);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        const day = txDate.getDate();
        if (day >= 1 && day <= daysInMonth) {
          dailyData[day - 1].Revenue += tx.amount;
        }
      }
    });
    
    const todayDay = now.getDate();
    return dailyData.slice(0, Math.max(todayDay, 7));
  };
  const dailyRevenueData = getCurrentMonthDailyRevenue();

  // Search filtered orders for order modal
  const filteredOrders = transactions.filter(tx => {
    if (tx.type !== 'Income') return false;
    const term = orderSearchQuery.toLowerCase();
    return tx.category.toLowerCase().includes(term) ||
           (tx.description && tx.description.toLowerCase().includes(term)) ||
           tx.amount.toString().includes(term);
  });

  // Wallet Insights chart data with Daily, Weekly, Monthly, Yearly grouping
  const getWalletChartData = () => {
    const now = new Date();
    const data = [];
    
    if (walletFilter === 'Daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        
        let income = 0;
        let expense = 0;
        transactions.forEach(tx => {
          const txTime = new Date(tx.date).getTime();
          if (txTime >= dayStart && txTime < dayEnd) {
            if (tx.type === 'Income') income += tx.amount;
            else expense += tx.amount;
          }
        });
        data.push({ name: dateStr, Income: income, Expense: expense });
      }
    } else if (walletFilter === 'Weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i * 7);
        const weekEnd = d.getTime();
        const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;
        
        const label = `Week -${i}`;
        let income = 0;
        let expense = 0;
        transactions.forEach(tx => {
          const txTime = new Date(tx.date).getTime();
          if (txTime >= weekStart && txTime < weekEnd) {
            if (tx.type === 'Income') income += tx.amount;
            else expense += tx.amount;
          }
        });
        data.push({ name: i === 0 ? 'This Week' : label, Income: income, Expense: expense });
      }
    } else if (walletFilter === 'Monthly') {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        const m = d.getMonth();
        const y = d.getFullYear();
        
        let income = 0;
        let expense = 0;
        transactions.forEach(tx => {
          const txDate = new Date(tx.date);
          if (txDate.getMonth() === m && txDate.getFullYear() === y) {
            if (tx.type === 'Income') income += tx.amount;
            else expense += tx.amount;
          }
        });
        data.push({ name: monthName, Income: income, Expense: expense });
      }
    } else if (walletFilter === 'Yearly') {
      // Last 3 years
      for (let i = 2; i >= 0; i--) {
        const d = new Date();
        d.setFullYear(now.getFullYear() - i);
        const yearStr = d.getFullYear().toString();
        const y = d.getFullYear();
        
        let income = 0;
        let expense = 0;
        transactions.forEach(tx => {
          const txDate = new Date(tx.date);
          if (txDate.getFullYear() === y) {
            if (tx.type === 'Income') income += tx.amount;
            else expense += tx.amount;
          }
        });
        data.push({ name: yearStr, Income: income, Expense: expense });
      }
    }
    return data;
  };
  const walletChartData = getWalletChartData();

  const handleSaveTarget = () => {
    if (tempTarget && !isNaN(tempTarget) && Number(tempTarget) > 0) {
      const newTarget = Number(tempTarget);
      setMonthlyTarget(newTarget);
      localStorage.setItem('monthlyTarget', newTarget.toString());
    }
    setIsEditingTarget(false);
  };

  const handleSaveExpenseLimit = () => {
    if (tempExpenseLimit && !isNaN(tempExpenseLimit) && Number(tempExpenseLimit) > 0) {
      const newLimit = Number(tempExpenseLimit);
      setMonthlyExpenseLimit(newLimit);
      localStorage.setItem('monthlyExpenseLimit', newLimit.toString());
    }
    setIsEditingExpenseLimit(false);
  };  // notifications memo has been moved below state declarations to avoid Temporal Dead Zone errors

  // Category Breakdown Data (Expenses based on Date Filter)
  const expenseCategoryData = {};
  transactions.filter(tx => {
    if (tx.type !== 'Expense') return false;
    if (tx.category === 'Account Transfer') return false;
    if (dateFilter === 'This Month') {
      return new Date(tx.date).getMonth() === new Date().getMonth() && new Date(tx.date).getFullYear() === new Date().getFullYear();
    }
    if (dateFilter === 'Last 7 Days') {
      return new Date(tx.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    return true;
  }).forEach(tx => {
    expenseCategoryData[tx.category] = (expenseCategoryData[tx.category] || 0) + tx.amount;
  });
  
  const pieData = Object.keys(expenseCategoryData).map(key => ({ name: key, value: expenseCategoryData[key] }));
  const PIE_COLORS = ['#0f172a', '#334155', '#475569', '#64748b']; // Minimalist slate palette

  // Navigation State
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'bills'
  const [homeModal, setHomeModal] = useState(null); // 'revenue' or 'balance'

  // Bill Generator States
  const [billData, setBillData] = useState({
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    addressLine1: '',
    addressLine2: '',
    city: '',
    gender: 'Male', // Default selection
    items: [{ id: crypto.randomUUID(), name: '', qty: 1, price: 0, photo: null }]
  });

  const handleBillItemChange = (id, field, value) => {
    setBillData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addBillItem = () => {
    setBillData(prev => ({ 
      ...prev, 
      items: [...prev.items, { id: crypto.randomUUID(), name: '', qty: 1, price: 0, photo: null }] 
    }));
  };

  const removeBillItem = (id) => {
    setBillData(prev => ({ 
      ...prev, 
      items: prev.items.filter(item => item.id !== id) 
    }));
  };

  const handleItemPhotoUpload = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setBillData(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === id) {
            if (item.photo) URL.revokeObjectURL(item.photo);
            return { ...item, photo: photoUrl };
          }
          return item;
        })
      }));
    }
  };

  // --- COD & PENDING BILLS STATES ---
  const [paymentMethod, setPaymentMethod] = useState('Direct');
  const [courierCharge, setCourierCharge] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [internalExpense, setInternalExpense] = useState('');
  // --- PERSISTED PENDING BILLS STATE ---
  // L-4: Wrapped in try/catch to handle corrupt localStorage data
  const [pendingBills, setPendingBills] = useState(() => {
    try {
      const savedPending = localStorage.getItem('pendingBills');
      return savedPending ? JSON.parse(savedPending) : [];
    } catch {
      return [];
    }
  });

  // Tracking number inline editing states
  const [editingTrackingBillId, setEditingTrackingBillId] = useState(null);
  const [tempTrackingNumber, setTempTrackingNumber] = useState('');

  // --- CRM STATES & DIALOGS ---
  const [searchQueryCRM, setSearchQueryCRM] = useState('');
  const [customers, setCustomers] = useState([]);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientFormData, setClientFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    dob: '',
    gender: 'Male',
    totalOrders: 0,
    totalSpent: 0
  });

  // Dynamic Notification Generation Logic (placed here to ensure all states are initialized first)
  const notifications = useMemo(() => {
    const list = [];

    // 1. Unconfirmed bills (>2 days old)
    pendingBills.forEach(bill => {
      const billDateObj = new Date(bill.date);
      const diffTime = Date.now() - billDateObj.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 2) {
        list.push({
          id: `bill-${bill.id}`,
          type: 'warning',
          title: 'Unconfirmed Order Alert',
          message: `Order for ${bill.customerName} has been pending for over 2 days.`,
          date: bill.date
        });
      }
    });

    // 2. Birthday reminders (2-3 days prior)
    customers.forEach(c => {
      if (c.dob && c.dob !== 'Pending' && c.dob.trim() !== '') {
        const dobParts = c.dob.split('-');
        if (dobParts.length === 3) {
          const dobMonth = parseInt(dobParts[1]) - 1;
          const dobDay = parseInt(dobParts[2]);
          const today = new Date();
          const bdayThisYear = new Date(today.getFullYear(), dobMonth, dobDay);
          
          let diffTime = bdayThisYear.getTime() - today.getTime();
          let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0 && diffDays >= -30) {
            const bdayNextYear = new Date(today.getFullYear() + 1, dobMonth, dobDay);
            diffTime = bdayNextYear.getTime() - today.getTime();
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          
          if (diffDays >= 0 && diffDays <= 3) {
            list.push({
              id: `bday-${c.id}`,
              type: 'birthday',
              title: `${c.name}'s Birthday`,
              message: diffDays === 0
                ? `Today is ${c.name}'s birthday! ðŸŽ‰`
                : `${c.name}'s birthday is in ${diffDays} day${diffDays > 1 ? 's' : ''} (${dobParts.slice(1).join('/')}).`,
              date: c.dob
            });
          }
        }
      }
    });

    // 3. Monthly target motivational notification
    if (monthlyTarget > 0) {
      const progress = targetProgress;
      let msg = '';
      if (progress < 25) {
        msg = `You have achieved ${progress.toFixed(1)}% of your LKR ${monthlyTarget.toLocaleString()} goal. Keep up the sales momentum!`;
      } else if (progress < 75) {
        msg = `Great going! You've achieved ${progress.toFixed(1)}% of your LKR ${monthlyTarget.toLocaleString()} monthly goal.`;
      } else if (progress < 100) {
        msg = `Almost there! You are at ${progress.toFixed(1)}% of your LKR ${monthlyTarget.toLocaleString()} target. Just a final push!`;
      } else {
        msg = `Fantastic job! ðŸŽ‰ You have achieved ${progress.toFixed(1)}% of your LKR ${monthlyTarget.toLocaleString()} monthly target. Goal achieved!`;
      }
      list.push({
        id: 'target-motivation',
        type: progress >= 100 ? 'success' : 'info',
        title: 'Monthly Revenue Goal',
        message: msg,
        date: new Date().toISOString().split('T')[0]
      });
    }

    // 4. Expense limit warning / alert
    if (monthlyExpenseLimit > 0) {
      if (currentMonthExpense > monthlyExpenseLimit) {
        list.push({
          id: 'expense-limit-exceeded',
          type: 'danger',
          title: 'Budget Limit Exceeded!',
          message: `Warning: Expenses this month (LKR ${currentMonthExpense.toLocaleString()}) exceed your budget limit of LKR ${monthlyExpenseLimit.toLocaleString()}!`,
          date: new Date().toISOString().split('T')[0]
        });
      } else if (currentMonthExpense > monthlyExpenseLimit * 0.8) {
        list.push({
          id: 'expense-limit-warning',
          type: 'warning',
          title: 'Approaching Budget Limit',
          message: `Notice: You have used ${((currentMonthExpense / monthlyExpenseLimit) * 100).toFixed(1)}% of your LKR ${monthlyExpenseLimit.toLocaleString()} monthly budget.`,
          date: new Date().toISOString().split('T')[0]
        });
      }
    }

    return list.filter(n => !dismissedNotifications.includes(n.id));
  }, [pendingBills, customers, monthlyTarget, targetProgress, monthlyExpenseLimit, currentMonthExpense, dismissedNotifications]);

  const handleDismissNotification = (id) => {
    setDismissedNotifications(prev => {
      const next = [...prev, id];
      localStorage.setItem('dismissedNotifications', JSON.stringify(next));
      return next;
    });
  };

  const handleClearAllNotifications = () => {
    const activeIds = notifications.map(n => n.id);
    setDismissedNotifications(prev => {
      const next = [...new Set([...prev, ...activeIds])];
      localStorage.setItem('dismissedNotifications', JSON.stringify(next));
      return next;
    });
  };

  // Auto-close notification panel when switching tabs
  useEffect(() => {
    setIsNotificationOpen(false);
  }, [activeTab]);

  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientFormData({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      dob: '',
      gender: 'Male',
      totalOrders: 0,
      totalSpent: 0
    });
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (client) => {
    setEditingClient(client);
    setClientFormData({
      name: client.name || '',
      addressLine1: client.address_line1 || '',
      addressLine2: client.address_line2 || '',
      city: client.city || '',
      dob: client.dob || '',
      gender: client.gender || 'Male',
      totalOrders: client.total_orders || 0,
      totalSpent: client.total_spent || 0
    });
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientFormData.name.trim()) {
      showToast("Please enter client name");
      return;
    }

    try {
      const isEdit = !!editingClient;
      const url = isEdit 
        ? `${API_BASE}/api/customers/${editingClient.id}`
        : `${API_BASE}/api/customers`;
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        name: clientFormData.name,
        address_line1: clientFormData.addressLine1 || null,
        address_line2: clientFormData.addressLine2 || null,
        city: clientFormData.city || null,
        dob: clientFormData.dob || null,
        gender: clientFormData.gender,
        total_orders: parseInt(clientFormData.totalOrders) || 0,
        total_spent: parseFloat(clientFormData.totalSpent) || 0.0
      };

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast(isEdit ? "Client updated successfully!" : "Client added successfully!");
        setIsClientModalOpen(false);
        fetchCustomers();
      } else {
        const errorMsg = typeof result.detail === 'string' 
          ? result.detail 
          : (Array.isArray(result.detail) 
              ? result.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ') 
              : "Failed to save client");
        showToast(errorMsg);
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  const handleDeleteClient = (clientId) => {
    setDeleteCustomerConfirmId(clientId);
  };

  const executeDeleteCustomer = async () => {
    if (!deleteCustomerConfirmId) return;

    try {
      const response = await fetch(`${API_BASE}/api/customers/${deleteCustomerConfirmId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast("Client deleted successfully");
        fetchCustomers();
      } else {
        showToast("Failed to delete client");
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
    setDeleteCustomerConfirmId(null);
  };

  const handleRemovePendingBill = (billId) => {
    setDeletePendingBillConfirmId(billId);
  };

  const executeDeletePendingBill = () => {
    if (!deletePendingBillConfirmId) return;
    setPendingBills(prev => prev.filter(b => b.id !== deletePendingBillConfirmId));
    showToast("Pending delivery removed successfully");
    setDeletePendingBillConfirmId(null);
  };

  // CRM Insights Calculations
  const totalClients = customers.length;
  const crmTotalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  const vipCount = customers.filter(c => (c.total_spent || 0) >= 10000).length;

  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchQueryCRM.toLowerCase()) || 
    (c.city && c.city.toLowerCase().includes(searchQueryCRM.toLowerCase()))
  );

  const filteredSuggestions = useMemo(() => {
    if (!customers) return [];
    const query = (billData.customerName || '').trim().toLowerCase();
    if (!query) {
      return [...customers]
        .sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))
        .slice(0, 5);
    }
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(query)
    );
  }, [customers, billData.customerName]);

// Auto-save pending bills to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pendingBills', JSON.stringify(pendingBills));
  }, [pendingBills]);

  // Auto-focus and smoothly scroll to the last item's name input when a new item is added
  useEffect(() => {
    if (billData.items.length > 1) {
      const inputs = document.querySelectorAll('.item-name-input');
      if (inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1];
        lastInput.focus();
        lastInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [billData.items.length]);

  const handleItemKeyDown = (e, fieldName, index) => {
    const totalItems = billData.items.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < totalItems) {
        const nextInput = document.querySelector(`.item-${fieldName}-input[data-index="${nextIndex}"]`);
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        const prevInput = document.querySelector(`.item-${fieldName}-input[data-index="${prevIndex}"]`);
        if (prevInput) prevInput.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (index === totalItems - 1) {
        addBillItem();
      } else {
        const nextInput = document.querySelector(`.item-${fieldName}-input[data-index="${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const parsedCourierCharge = paymentMethod === 'COD' ? (parseFloat(courierCharge) || 0) : 0;
  const parsedInternalExpense = parseFloat(internalExpense) || 0;
  const profitAmount = billData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const billTotal = profitAmount + parsedCourierCharge;

  const handleCompleteOrder = () => {
    if (!billData.customerName) {
      showToast("Please enter customer name to complete order");
      return;
    }

    // 1. Trigger the print dialog first while the data is still in the DOM
    window.print();

    // 2. Save the order to Pending Deliveries
    const newBill = { ...billData, id: crypto.randomUUID(), paymentMethod, courierCharge: parsedCourierCharge, internalExpense: parsedInternalExpense, trackingNumber, profitAmount, total: billTotal };
    setPendingBills(prev => [newBill, ...prev]);

    // 3. Reset form, show success message, and scroll up (slight timeout ensures print triggers safely)
    setTimeout(() => {
      setBillData({
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        addressLine1: '',
        addressLine2: '',
        city: '',
        gender: 'Male',
        items: [{ id: crypto.randomUUID(), name: '', qty: 1, price: 0, photo: null }]
      });
      setPaymentMethod('Direct'); 
      setCourierCharge(''); 
      setTrackingNumber('');
      setInternalExpense('');
      showToast("Order Completed & Saved to Pending!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  };

  const handleResetBill = () => {
    setBillData({
      customerName: '',
      date: new Date().toISOString().split('T')[0],
      addressLine1: '',
      addressLine2: '',
      city: '',
      gender: 'Male',
      items: [{ id: crypto.randomUUID(), name: '', qty: 1, price: 0, photo: null }]
    });
    setPaymentMethod('Direct');
    setCourierCharge('');
    setTrackingNumber('');
    setInternalExpense('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmDelivery = async (bill) => {
    try {
      // Pack city into description to avoid DB schema changes
      const descriptionText = `${bill.paymentMethod} Order - Tracking: ${bill.trackingNumber || 'N/A'} - ${bill.customerName} - ${bill.city || 'No City'}`;
      // COD orders land in COD Pending, Direct orders land in Cash in Hand
      const targetAccount = bill.paymentMethod === 'COD' ? 'COD Pending' : 'Cash in Hand';
      
      const netProfit = bill.profitAmount - (bill.internalExpense || 0);

      const response = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'Income', 
          amount: netProfit, 
          category: bill.paymentMethod === 'COD' ? 'Cactus sale Online' : 'Cactus Sale Physical', 
          description: descriptionText,
          account_name: targetAccount
        }),
      });

      if (response.ok) {
        // Record order details inside backend PostgreSQL customers table
        try {
          await fetch(`${API_BASE}/api/customers/record-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_name: bill.customerName || 'Walk-in Customer',
              address_line1: bill.addressLine1 || null,
              address_line2: bill.addressLine2 || null,
              city: bill.city || null,
              gender: bill.gender || 'Other',
              amount: netProfit
            })
          });
          fetchCustomers(); // Reload lists from DB
        } catch (err) {
          console.error("Error recording customer order:", err);
          showToast("Order completed, but customer profile sync failed");
        }

        setPendingBills(prev => prev.filter(b => b.id !== bill.id));
        showToast(`Income of LKR ${netProfit} added!`);
        fetchTransactions();
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };

  const handleSaveTrackingNumber = (billId) => {
    setPendingBills(prev => 
      prev.map(bill => 
        bill.id === billId 
          ? { ...bill, trackingNumber: tempTrackingNumber.trim() } 
          : bill
      )
    );
    setEditingTrackingBillId(null);
    showToast("Tracking number updated successfully!");
  };

  const isBillActive = billData.customerName.trim() !== '' || billData.items.some(item => item.name.trim() !== '' || item.price > 0 || item.photo);

  const handleReprintBill = (bill) => {
    setReprintData(bill);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Clear reprintData after printing finishes
  useEffect(() => {
    const handleAfterPrint = () => {
      setReprintData(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const displayBill = reprintData || billData;
  const isDisplayCOD = reprintData ? reprintData.paymentMethod === 'COD' : paymentMethod === 'COD';
  const displayCourierCharge = reprintData ? reprintData.courierCharge : parsedCourierCharge;
  const displayTotal = reprintData ? reprintData.total : billTotal;
  const displayTrackingNumber = reprintData ? reprintData.trackingNumber : trackingNumber;

  // Dynamic Analytics Aggregation
  const locationData = Object.entries(
    customers.reduce((acc, c) => {
      const city = c.city && c.city !== 'Unknown' ? c.city : 'Other';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, clients]) => ({ name, clients })).sort((a, b) => b.clients - a.clients).slice(0, 5);

  const genderData = Object.entries(
    customers.reduce((acc, c) => {
      const g = c.gender || 'Other';
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const ageData = [
    { age: '18-24', count: 0 }, { age: '25-34', count: 0 }, 
    { age: '35-44', count: 0 }, { age: '45+', count: 0 }
  ];
  customers.forEach(c => {
    if (!c.dob || c.dob === 'Pending') return;
    const dobDate = new Date(c.dob);
    if (isNaN(dobDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age >= 18 && age <= 24) ageData[0].count++;
    else if (age >= 25 && age <= 34) ageData[1].count++;
    else if (age >= 35 && age <= 44) ageData[2].count++;
    else if (age >= 45) ageData[3].count++;
  });
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

  // --- WALLET / FINANCE STATES & CALCULATIONS ---
  const [activeMetricModal, setActiveMetricModal] = useState(null); // 'margin' or 'growth'

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({ amount: '', category: 'Plant Accessories', description: '', account_name: 'Cash in Hand' });

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawData, setWithdrawData] = useState({ amount: '', category: 'Personal Use', description: '', account_name: 'Cash in Hand' });

  // Monthly Growth Calculation (Current Month Income vs Previous Month Income - with year boundary check)
  const now = new Date();
  const currentMonthVal = now.getMonth();
  const currentYearVal = now.getFullYear();
  const prevMonthVal = currentMonthVal === 0 ? 11 : currentMonthVal - 1;
  const prevYearVal = currentMonthVal === 0 ? currentYearVal - 1 : currentYearVal;

  const prevMonthIncome = transactions.filter(t => {
    if (t.type !== 'Income' || t.category === 'Account Transfer') return false;
    const d = new Date(t.date || Date.now());
    return d.getMonth() === prevMonthVal && d.getFullYear() === prevYearVal;
  }).reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyGrowth = prevMonthIncome === 0 
    ? (currentMonthIncome > 0 ? 100 : 0) 
    : (((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100).toFixed(1);

  const currentBalance = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((currentBalance / totalIncome) * 100).toFixed(1) : 0;

  // Dynamic Chart Data based on real transactions
  const marginChartData = [
    { name: 'Net Profit', value: currentBalance > 0 ? currentBalance : 0 },
    { name: 'Expenses', value: totalExpense }
  ];

  const monthlyTrendData = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i)); // Last 6 months chronological
    const monthName = d.toLocaleString('default', { month: 'short' });
    const income = transactions.filter(t => t.type === 'Income' && t.category !== 'Account Transfer' && new Date(t.date || Date.now()).getMonth() === d.getMonth()).reduce((s, t) => s + t.amount, 0);
    return { name: monthName, income };
  });

  // Expense Distribution Data
  const expenseDistribution = Object.entries(
    transactions.filter(t => t.type === 'Expense' && t.category !== 'Account Transfer').reduce((acc, t) => {
      // Remove 'Withdrawal: ' prefix for cleaner chart labels
      const cat = t.category.replace('Withdrawal: ', '');
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const EXPENSE_COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#64748b'];

  const handleWithdraw = async () => {
    if (!withdrawData.amount) {
      showToast("Please enter the amount");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'Expense', 
          amount: parseFloat(withdrawData.amount), 
          category: `Withdrawal: ${withdrawData.category}`, 
          description: withdrawData.description || 'Capital Withdrawal',
          account_name: withdrawData.account_name || 'Cash in Hand'
        }),
      });
      if (response.ok) {
        showToast("Withdrawal recorded successfully!");
        setWithdrawData({ amount: '', category: 'Personal Use', description: '', account_name: 'Cash in Hand' });
        setShowWithdrawForm(false);
        fetchTransactions();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseData.amount) {
      showToast("Please enter the amount");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'Expense', 
          amount: parseFloat(expenseData.amount), 
          category: expenseData.category, 
          description: expenseData.description || 'No description provided',
          account_name: expenseData.account_name || 'Cash in Hand'
        }),
      });
      if (response.ok) {
        showToast("Expense recorded successfully!");
        setExpenseData({ amount: '', category: 'Plant Accessories', description: '', account_name: 'Cash in Hand' });
        setShowExpenseForm(false);
        fetchTransactions();
      }
    } catch (error) {
      showToast("Network error! Server is down.");
    }
  };



  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-28 text-slate-900 selection:bg-zinc-900 selection:text-white relative print:pb-0 print:bg-white">
      
      {/* Toast Notification */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-400 ease-out flex items-center gap-3 bg-zinc-900 text-white px-5 py-3.5 rounded-full shadow-2xl border border-zinc-800/50 ${toast.visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-10 opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={14} className="text-emerald-400" strokeWidth={2.5} />
        </div>
        <span className="text-[13px] font-semibold tracking-wide pr-2">{toast.message}</span>
      </div>

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md px-6 py-5 flex justify-between items-center border-b border-slate-200/60 print:hidden">
        <div onClick={() => { setActiveTab('home'); setViewMode('dashboard'); }} className="flex items-center gap-3 cursor-pointer group select-none">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 group-hover:bg-slate-200 transition-colors">
            <Wallet size={18} strokeWidth={1.5} className="text-slate-800" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 transition-colors">Workspace</h1>
            <p className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-slate-950 transition-colors">Blooming Barrels</p>
          </div>
        </div>
        <button 
          onClick={() => setIsNotificationOpen(!isNotificationOpen)} 
          className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Bell size={20} strokeWidth={1.5} />
          {notifications.length > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
          )}
        </button>
      </header>

      {/* Mobile-Responsive Executive Home Dashboard */}
      {activeTab === 'home' && (
        <main className="px-4 md:px-8 pt-6 pb-28 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-200/60 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
            </div>
            <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl inline-flex items-center gap-2 self-start md:self-auto shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">System Online</span>
            </div>
          </div>

          {/* Premium Net Balance Card - Black Aesthetic */}
          <div className="bg-[#0b0f19] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
            {/* Soft decorative background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Net Available Balance</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                LKR {currentBalance ? currentBalance.toLocaleString() : '0'}
              </h3>
            </div>
            
            <div className="flex gap-6 border-t border-slate-800/85 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto relative z-10">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Income</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-bold text-emerald-400">LKR {totalIncome.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-l border-slate-800 h-10 self-center"></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-sm font-bold text-rose-400">LKR {totalExpense.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-7 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"><TrendingUp size={20} strokeWidth={2.5}/></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Monthly Target</h3>
                      {!isEditingTarget && (
                        <button 
                          onClick={() => {
                            setTempTarget(monthlyTarget.toString());
                            setIsEditingTarget(true);
                          }}
                          className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                          title="Edit Target"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                    </div>
                    {isEditingTarget ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          value={tempTarget}
                          onChange={(e) => setTempTarget(e.target.value)}
                          className="w-24 px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                          placeholder="LKR"
                        />
                        <button onClick={handleSaveTarget} className="text-emerald-500 hover:text-emerald-600 p-0.5 cursor-pointer">
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button onClick={() => setIsEditingTarget(false)} className="text-rose-500 hover:text-rose-600 p-0.5 cursor-pointer">
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">LKR {monthlyTarget.toLocaleString()} Goal</p>
                    )}
                  </div>
                </div>
                <p className="text-2xl font-black text-blue-600">{targetProgress.toFixed(1)}%</p>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3.5 rounded-full transition-all duration-1000" style={{ width: `${targetProgress}%` }}></div>
              </div>
              <p className="text-xs font-semibold text-slate-500 text-right">
                LKR {currentMonthIncome.toLocaleString()} achieved
              </p>
            </div>

            {/* Monthly Expense Limit Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-7 shadow-sm relative overflow-hidden flex flex-col justify-center">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"><MinusCircle size={20} strokeWidth={2.5}/></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Expense Limit</h3>
                      {!isEditingExpenseLimit && (
                        <button 
                          onClick={() => {
                            setTempExpenseLimit(monthlyExpenseLimit.toString());
                            setIsEditingExpenseLimit(true);
                          }}
                          className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                          title="Edit Limit"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                    </div>
                    {isEditingExpenseLimit ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          value={tempExpenseLimit}
                          onChange={(e) => setTempExpenseLimit(e.target.value)}
                          className="w-24 px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                          placeholder="LKR"
                        />
                        <button onClick={handleSaveExpenseLimit} className="text-emerald-500 hover:text-emerald-600 p-0.5 cursor-pointer">
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <button onClick={() => setIsEditingExpenseLimit(false)} className="text-rose-500 hover:text-rose-600 p-0.5 cursor-pointer">
                          <X size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">LKR {monthlyExpenseLimit.toLocaleString()} Budget</p>
                    )}
                  </div>
                </div>
                <p className={`text-2xl font-black ${expenseLimitProgress >= 100 ? 'text-rose-600 animate-pulse' : expenseLimitProgress >= 80 ? 'text-amber-500' : 'text-slate-700'}`}>{expenseLimitProgress.toFixed(1)}%</p>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
                <div className={`h-3.5 rounded-full transition-all duration-1000 ${expenseLimitProgress >= 100 ? 'bg-gradient-to-r from-red-500 to-rose-600' : expenseLimitProgress >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} style={{ width: `${expenseLimitProgress}%` }}></div>
              </div>
              <p className="text-xs font-semibold text-slate-500 text-right">
                LKR {currentMonthExpense.toLocaleString()} spent
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-7 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Income vs Expense</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-6">Current Month Insight</p>
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenseData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="name" type="category" width={60} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}/>
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 / 0.1)' }} formatter={(value) => `LKR ${value.toLocaleString()}`} />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={24}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-2">
            <div onClick={() => setHomeModal('revenue')} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all duration-300 group relative">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-blue-400"/></div>
              <div className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-all mb-4"><TrendingUp size={16} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  LKR {transactions.filter(t => t.type === 'Income' && t.category !== 'Account Transfer' && new Date(t.date || Date.now()).toDateString() === new Date().toDateString()).reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div onClick={() => setHomeModal('balance')} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all duration-300 group relative">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="textemerald-400"/></div>
              <div className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-all mb-4"><Activity size={16} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                  LKR {currentBalance ? currentBalance.toLocaleString() : '0'}
                </p>
              </div>
            </div>

            <div onClick={() => setHomeModal('orders')} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-400 cursor-pointer transition-all duration-300 group relative">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-slate-400"/></div>
              <div className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-all mb-4"><PieChartIcon size={16} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{transactions.filter(t => t.type === 'Income' && t.category !== 'Account Transfer').length}</p>
              </div>
            </div>

            <div onClick={() => setHomeModal('expenses')} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-400 cursor-pointer transition-all duration-300 group relative">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-rose-400"/></div>
              <div className="w-9 h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-rose-500 group-hover:text-white transition-all mb-4"><CreditCard size={16} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Exp.</p>
                <p className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">LKR {currentMonthExpense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-col lg:flex-row gap-5 md:gap-6">
            <div className="flex-1 bg-[#0B1121] rounded-3xl p-5 md:p-7 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 rounded-full blur-[50px] pointer-events-none"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Recent Transactions</h3>
                <button onClick={() => setActiveTab('wallet')} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors flex items-center gap-1">
                  See All <ArrowUpRight size={12}/>
                </button>
              </div>
              
              <div className="divide-y divide-slate-800/80 relative z-10">
                {transactions.slice(0, 4).map((t, i) => (
                  <div key={t.id || i} className="py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'Income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {t.type === 'Income' ? <ArrowUpRight size={14} strokeWidth={2.5}/> : <ArrowDownRight size={14} strokeWidth={2.5}/>}
                      </div>
                      <div>
                        <p className="text-xs md:text-sm font-bold text-slate-200">{t.category}</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 font-semibold mt-0.5 max-w-[120px] sm:max-w-[200px] truncate">{t.description}</p>
                        {t.date && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                            <Calendar size={9} className="text-slate-500" />
                            {formatDate(t.date)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs md:text-sm font-bold ${t.type === 'Income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {t.type === 'Income' ? '+' : '-'} {t.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {homeModal && (
            <div onClick={() => setHomeModal(null)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300 animate-out fade-out">
              <div 
                onClick={(e) => e.stopPropagation()} 
                className={`bg-white rounded-[2rem] p-7 w-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] relative animate-in zoom-in-95 duration-300 ${
                  homeModal === 'expenses' || homeModal === 'orders' ? 'max-w-2xl' : 'max-w-lg'
                }`}
              >
                <button onClick={() => setHomeModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full transition-all cursor-pointer">
                  <X size={18} strokeWidth={2.5}/>
                </button>
                <div className="mb-6 pl-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {homeModal === 'balance' && 'Profit vs Expenses'}
                    {homeModal === 'revenue' && 'Daily Revenue Insight'}
                    {homeModal === 'expenses' && 'Monthly Expenses Breakdown'}
                    {homeModal === 'orders' && 'Sales & Orders Ledger'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    {homeModal === 'balance' && 'Capital distribution breakdown'}
                    {homeModal === 'revenue' && 'Day-by-day revenue breakdown for the current month'}
                    {homeModal === 'expenses' && 'Detailed outlays and categories for the current month'}
                    {homeModal === 'orders' && 'All customer orders and revenue transactions'}
                  </p>
                </div>

                {homeModal === 'balance' && (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={marginChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={6} dataKey="value" stroke="none">
                          <Cell fill="#3b82f6"/><Cell fill="#f43f5e"/>
                        </Pie>
                        <Tooltip formatter={(value) => `LKR ${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {homeModal === 'revenue' && (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDailyRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}/>
                        <Tooltip formatter={(value) => [`LKR ${value.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                        <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDailyRev)"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {homeModal === 'expenses' && (
                  <div>
                    <div className="flex justify-between items-center bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Total Month Expenses</p>
                        <p className="text-xl font-black text-rose-600 mt-1">LKR {currentMonthExpense.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><CreditCard size={18} /></div>
                    </div>
                    
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Expense Log</h4>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {transactions.filter(tx => 
                        tx.type === 'Expense' && 
                        new Date(tx.date || Date.now()).getMonth() === new Date().getMonth() && 
                        new Date(tx.date || Date.now()).getFullYear() === new Date().getFullYear()
                      ).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-100 rounded-2xl">No expenses recorded for this month.</p>
                      ) : (
                        transactions.filter(tx => 
                          tx.type === 'Expense' && 
                          new Date(tx.date || Date.now()).getMonth() === new Date().getMonth() && 
                          new Date(tx.date || Date.now()).getFullYear() === new Date().getFullYear()
                        ).map((tx, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl border border-slate-100/50 transition-all">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{tx.category.replace('Withdrawal: ', 'Withdrawal - ')}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 max-w-[280px] truncate">{tx.description || 'No memo'}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            <p className="text-xs font-bold text-rose-500">- LKR {tx.amount.toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {homeModal === 'orders' && (
                  <div>
                    <div className="mb-4 relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search orders by customer name, category, or amount..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Ledger Results</h4>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {filteredOrders.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-100 rounded-2xl">No matching orders found.</p>
                      ) : (
                        filteredOrders.map((tx, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl border border-slate-100/50 transition-all">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-800">{tx.category}</p>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded">Sales</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 max-w-[280px] truncate">{tx.description || 'Direct Order'}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                            {editingTransactionId === tx.id ? (
                              <div className="flex flex-col gap-1.5 items-end">
                                <input
                                  type="number"
                                  value={editingAmount}
                                  onChange={(e) => setEditingAmount(e.target.value)}
                                  className="w-24 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                  autoFocus
                                />
                                <div className="flex gap-1.5">
                                  <button onClick={() => saveTransactionAmount(tx.id)} className="text-[9px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded transition-colors shadow-sm cursor-pointer">Save</button>
                                  <button onClick={() => setEditingTransactionId(null)} className="text-[9px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded transition-colors cursor-pointer">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1.5">
                                <p className="text-xs font-bold text-emerald-500">+ LKR {tx.amount.toLocaleString()}</p>
                                <button 
                                  onClick={() => { setEditingTransactionId(tx.id); setEditingAmount(tx.amount); }} 
                                  className="text-[10px] text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-colors bg-white/50 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer"
                                >
                                  <Edit size={10} /> Edit
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      )}

      {activeTab === 'bills' && (
        <main className="px-6 pt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-28">
          <style>{`
            @media print {
              @page { 
                margin: 0; 
                size: portrait;
              }
              *, *:before, *:after {
                box-sizing: border-box !important;
              }
              body { 
                background: #ffffff !important; 
                color: #0f172a !important; 
                margin: 0 !important;
                padding: 1.5cm !important;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              html, body {
                width: 100%;
                height: auto;
              }
              main {
                padding: 0 !important;
                margin: 0 !important;
              }
              div.min-h-screen {
                min-height: auto !important;
                padding-bottom: 0 !important;
              }
              .printable-receipt {
                background: #ffffff !important;
                background-image: none !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                border-radius: 0 !important;
              }
              .printable-receipt h3,
              .printable-receipt p,
              .printable-receipt span,
              .printable-receipt div {
                color: #0f172a !important;
              }
              .printable-receipt p.uppercase {
                color: #64748b !important;
              }
              .printable-receipt p.text-slate-400,
              .printable-receipt p.text-slate-500,
              .printable-receipt p.text-xs {
                color: #64748b !important;
              }
              .printable-receipt span.font-semibold,
              .printable-receipt span.print\\:text-slate-950 {
                color: #0f172a !important;
                font-weight: 700 !important;
              }
              .printable-receipt span.text-4xl {
                color: #0f172a !important;
                background: none !important;
                -webkit-text-fill-color: #0f172a !important;
                font-weight: 900 !important;
              }
              .printable-receipt .border-b,
              .printable-receipt .border-t {
                border-color: #cbd5e1 !important;
              }
            }
          `}</style>
          <div className="flex justify-between items-center mb-2 print:hidden">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Receipt</h2>
          </div>

          {/* Form Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 print:hidden">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Customer Name</label>
                <input 
                  type="text" 
                  value={billData.customerName} 
                  onChange={(e) => setBillData({...billData, customerName: e.target.value})} 
                  onFocus={() => setIsClientDropdownOpen(true)}
                  onBlur={() => setIsClientDropdownOpen(false)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all placeholder:text-slate-400" 
                  placeholder="e.g. John Doe"
                  autoComplete="off"
                />
                {isClientDropdownOpen && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredSuggestions.map((cust) => (
                      <div
                        key={cust.id}
                        onMouseDown={() => {
                          setBillData(prev => ({
                            ...prev,
                            customerName: cust.name,
                            addressLine1: cust.address_line1 || '',
                            addressLine2: cust.address_line2 || '',
                            city: cust.city || '',
                            gender: cust.gender || 'Male'
                          }));
                          setIsClientDropdownOpen(false);
                        }}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors text-left"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{cust.name}</p>
                          {(cust.city || cust.gender) && (
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {[cust.city, cust.gender].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500">{cust.total_orders} orders</p>
                          {(cust.total_spent || 0) >= 10000 && (
                            <span className="inline-block mt-0.5 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-sm">
                              VIP
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Date</label>
                <input type="date" value={billData.date} onChange={(e) => setBillData({...billData, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all" />
              </div>
            </div>
            
            {/* Structured Address Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Address Line 1</label>
                <input type="text" placeholder="e.g. 45/2, Orchid Lane" value={billData.addressLine1} onChange={(e) => setBillData(prev => ({ ...prev, addressLine1: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Address Line 2</label>
                <input type="text" placeholder="e.g. Peradeniya Rd" value={billData.addressLine2} onChange={(e) => setBillData(prev => ({ ...prev, addressLine2: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">City</label>
                <input type="text" placeholder="e.g. Kandy" value={billData.city} onChange={(e) => setBillData(prev => ({ ...prev, city: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Gender</label>
                 <select value={billData.gender} onChange={(e) => setBillData(prev => ({ ...prev, gender: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 cursor-pointer">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                 </select>
              </div>
            </div>

            {/* Payment & Tracking Section */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 print:hidden mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Payment Method</label>
                  <div className="flex gap-2 bg-slate-200/50 p-1 rounded-md">
                    <button type="button" onClick={() => setPaymentMethod('Direct')} className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider cursor-pointer transition-colors ${paymentMethod === 'Direct' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Direct Payment</button>
                    <button type="button" onClick={() => setPaymentMethod('COD')} className={`flex-1 py-2 text-xs font-bold rounded uppercase tracking-wider cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Cash On Delivery</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Internal Expense / Postage (LKR)</label>
                  <input type="number" placeholder="e.g. 150" value={internalExpense} onChange={(e) => setInternalExpense(e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900" />
                </div>
              </div>

              {paymentMethod === 'COD' && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Courier Charge (LKR)</label>
                    <input type="number" placeholder="e.g. 450" value={courierCharge} onChange={(e) => setCourierCharge(e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tracking Number</label>
                    <input type="text" placeholder="e.g. CD234857" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-400" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Line Items</label>
              <div className="space-y-3">
                {billData.items.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <label className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors">
                      <ImagePlus size={18} strokeWidth={2} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleItemPhotoUpload(item.id, e)} />
                    </label>
                    <input type="text" placeholder="Item name" value={item.name} onChange={e => handleBillItemChange(item.id, 'name', e.target.value)} onKeyDown={e => handleItemKeyDown(e, 'name', idx)} data-index={idx} className="item-name-input flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400 font-medium" />
                    <input type="number" placeholder="Qty" value={item.qty} onChange={e => handleBillItemChange(item.id, 'qty', parseInt(e.target.value) || 0)} onKeyDown={e => handleItemKeyDown(e, 'qty', idx)} data-index={idx} className="item-qty-input w-16 bg-slate-50 text-center text-sm focus:outline-none rounded py-1 font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" min="1" />
                    <input type="number" placeholder="Price" value={item.price === 0 ? '' : item.price} onChange={e => handleBillItemChange(item.id, 'price', parseFloat(e.target.value) || 0)} onKeyDown={e => handleItemKeyDown(e, 'price', idx)} data-index={idx} className="item-price-input w-24 bg-slate-50 text-right text-sm focus:outline-none rounded py-1 px-2 font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" min="0" />
                    <button type="button" onClick={() => removeBillItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"><MinusCircle size={18} strokeWidth={2} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBillItem} className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                <Plus size={14} strokeWidth={2.5} /> Add Item
              </button>
            </div>
          </section>

          {/* Premium Live Preview Section (Animated & Conditional) */}
          {(isBillActive || reprintData) && (
            <section className="printable-receipt bg-gradient-to-b from-slate-900 to-[#0B1120] rounded-2xl shadow-2xl p-6 md:p-8 text-white relative overflow-hidden group print:bg-white print:text-slate-900 print:shadow-none print:p-8 print:m-0 print:border-none ring-1 ring-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out mt-4">
              {/* Ambient Premium Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] pointer-events-none print:hidden"></div>
              
              {/* Header */}
              <div className="border-b border-dashed border-slate-700/60 print:border-solid print:border-slate-300 pb-5 mb-5 relative z-10">
                <h3 className="text-xl print:text-2xl font-black tracking-tight mb-1 text-slate-100">Blooming Barrels</h3>
                <p className="text-[10px] text-slate-400 print:text-slate-500 uppercase tracking-widest font-semibold">Receipt / Invoice</p>
              </div>
              
              {/* Billed To & Date */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 print:text-slate-400 mb-1">Billed To</p>
                  <p className="text-sm font-bold text-slate-200">{displayBill.customerName || 'Walk-in Customer'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 print:text-slate-400 mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-200">{displayBill.date}</p>
                  {isDisplayCOD && displayTrackingNumber && (
                    <div className="mt-3 print:mt-2">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500 print:text-slate-400 mb-1">Tracking No</p>
                      <p className="text-sm font-bold text-slate-200 print:text-slate-800">{displayTrackingNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4 mb-8 print:mb-10 min-h-[100px] relative z-10">
                {displayBill.items.map((item, i) => (
                  item.name || item.price > 0 || item.photo ? (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-4">
                        {item.photo && (
                          <img src={item.photo} alt="item" className="w-10 h-10 print:w-12 print:h-12 rounded-lg object-cover border border-slate-700/50 print:border-slate-200 shadow-sm" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-200 print:text-slate-900 print:font-bold">{item.name || 'Unnamed item'}</p>
                          <p className="text-slate-400 print:text-slate-500 text-xs mt-0.5">Qty: {item.qty}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-300 print:text-slate-900 print:font-bold">{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  ) : null
                ))}
                
                {/* Courier Charge Logic */}
                {isDisplayCOD && displayCourierCharge > 0 && (
                  <div className="flex justify-between items-center text-sm border-t border-slate-700/60 print:border-slate-300 pt-4 mt-4">
                    <span className="font-medium text-slate-400 print:text-slate-600">Courier / Delivery Charge</span>
                    <span className="font-semibold text-slate-300 print:text-slate-900 print:font-bold">{displayCourierCharge.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Premium Total Section */}
              <div className="flex justify-between items-end border-t border-slate-700/60 print:border-slate-300 pt-6 mb-8 relative z-10">
                <span className="text-xs uppercase tracking-widest font-black text-slate-400 print:text-slate-500 mb-1">Total Due (LKR)</span>
                <span className="text-4xl print:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 print:text-slate-950 print:bg-none">
                  {displayTotal.toLocaleString()}
                </span>
              </div>

              <div className="text-center mb-6 hidden print:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thank you for your business</p>
                <p className="text-xs font-semibold text-slate-800 mt-1">bloomingbarrels.lk</p>
              </div>

              {/* Action Buttons */}
              {!reprintData && (
                <div className="flex flex-col gap-3 mt-8 print:hidden relative z-10">
                  <button 
                    onClick={handleCompleteOrder} 
                    className="w-full flex items-center justify-center gap-2 bg-blue-950 text-blue-300 py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-900 hover:text-blue-200 active:scale-[0.98] transition-all border border-blue-800/80 hover:border-blue-600 shadow-lg shadow-blue-900/30 cursor-pointer"
                  >
                    <Printer size={18} strokeWidth={2.5} />
                    Complete Order & Print
                  </button>
                
                <button 
                  onClick={handleResetBill} 
                  className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} strokeWidth={2.5} /> Discard & Start Fresh
                </button>
              </div>
            )}
          </section>
          )}

          {/* Pending Deliveries Dashboard */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-4 print:hidden">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-5">Pending Deliveries</h3>
            
            {pendingBills.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm font-medium">
                No pending orders. All parcels delivered!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBills.map(bill => (
                  <div key={bill.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-900">{bill.customerName}</p>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest ${bill.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {bill.paymentMethod}
                        </span>
                      </div>
                      {editingTrackingBillId === bill.id ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input 
                            type="text" 
                            value={tempTrackingNumber}
                            onChange={(e) => setTempTrackingNumber(e.target.value)}
                            placeholder="Tracking Number"
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-900 font-bold w-36 sm:w-44"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleSaveTrackingNumber(bill.id)}
                            className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 cursor-pointer"
                            title="Save"
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                          <button 
                            onClick={() => setEditingTrackingBillId(null)}
                            className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                            title="Cancel"
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs font-semibold text-slate-500">
                            {bill.trackingNumber ? `Tracking: ${bill.trackingNumber}` : 'No tracking added'}
                          </p>
                          <button 
                            onClick={() => {
                              setEditingTrackingBillId(bill.id);
                              setTempTrackingNumber(bill.trackingNumber || '');
                            }}
                            className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded hover:bg-slate-200 cursor-pointer flex items-center justify-center"
                            title="Edit Tracking"
                          >
                            <Edit size={10} strokeWidth={2.5} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {bill.internalExpense > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Internal Exp.</p>
                          <p className="text-sm font-black text-slate-500">LKR {bill.internalExpense.toLocaleString()}</p>
                        </div>
                      )}
                      <div className={`text-right ${bill.internalExpense > 0 ? 'border-l border-slate-200 pl-4' : ''}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Profit</p>
                        <p className="text-sm font-black text-emerald-600">LKR {(bill.profitAmount - (bill.internalExpense || 0)).toLocaleString()}</p>
                      </div>
                      <div className="text-right border-l border-slate-200 pl-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Bill</p>
                        <p className="text-sm font-black text-slate-900">LKR {bill.total.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button 
                          onClick={() => handleConfirmDelivery(bill)} 
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => handleReprintBill(bill)} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center border border-slate-200 hover:border-blue-200"
                          title="Reprint Bill"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => handleRemovePendingBill(bill.id)} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center border border-slate-200 hover:border-rose-200"
                          title="Remove Pending Delivery"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* Business Insights & CRM Tab */}
      {activeTab === 'crm' && (
        <main className="px-6 pt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-28">
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Insights</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Business Analytics</p>
            </div>
          </div>

          {/* Premium Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            
            {/* Location Bar Chart - Premium */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm lg:col-span-2 group">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Clients by Location</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLocation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontWeight: 700, color: '#0f172a' }} />
                    <Bar dataKey="clients" fill="url(#colorLocation)" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gender Pie Chart - Premium */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gender Demographics</h3>
              <div className="h-[180px] w-full flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f43f5e'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-[11px] font-bold text-slate-500 mt-2">
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>Male</span>
                <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>Female</span>
              </div>
            </div>

            {/* Age Distribution Chart - Premium Dark */}
            <div className="bg-[#0B1121] border border-slate-800/80 p-5 rounded-3xl shadow-xl lg:col-span-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none"></div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 relative z-10">Age Distribution</h3>
              <div className="h-[200px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#c084fc" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
                    <Tooltip cursor={{ fill: '#0f172a' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 700 }} />
                    <Bar dataKey="count" fill="url(#colorAge)" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Compact Client Directory (Like Recent Transactions) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-2">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client Directory</h3>
                <button 
                  onClick={handleOpenAddClient} 
                  className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-black text-white uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer animate-in fade-in"
                >
                  <Plus size={10} strokeWidth={3} /> Add Client
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQueryCRM}
                  onChange={(e) => setSearchQueryCRM(e.target.value)}
                  placeholder="Search clients..." 
                  className="bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-slate-400 text-sm font-medium">No clients found.</p>
                </div>
              ) : (
                filteredCustomers.map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-black text-sm uppercase">
                        {c.name ? c.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{c.name}</p>
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${c.gender === 'Male' ? 'bg-blue-50 text-blue-600' : c.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {c.gender}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          {c.total_orders} Orders â€¢ Last: {c.last_order || 'N/A'}
                        </p>
                        {(c.address_line1 || c.city) && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5 max-w-[200px] sm:max-w-md truncate">
                            {[c.address_line1, c.address_line2, c.city].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">LKR {(c.total_spent || 0).toLocaleString()}</p>
                        <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${(c.total_spent || 0) >= 10000 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {(c.total_spent || 0) >= 10000 ? 'VIP' : 'Standard'}
                        </span>
                      </div>
                      <div className="flex gap-1 border-l border-slate-150 pl-3">
                        <button 
                          onClick={() => handleOpenEditClient(c)}
                          className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 cursor-pointer"
                          title="Edit details"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(c.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                          title="Delete client"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* Ultra-Premium Wallet / Finance Hub */}
      {activeTab === 'wallet' && (
        <main className="px-6 pt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-28">
          
          {/* Header */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Finance Hub</h2>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Capital Management</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowWithdrawForm(!showWithdrawForm); setShowExpenseForm(false); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${showWithdrawForm ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-inner' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
              >
                {showWithdrawForm ? <X size={16} strokeWidth={2.5}/> : <ArrowDownRight size={16} strokeWidth={2.5} className="text-slate-400"/>}
                {showWithdrawForm ? 'Cancel' : 'Withdraw'}
              </button>
              <button 
                onClick={() => { setShowExpenseForm(!showExpenseForm); setShowWithdrawForm(false); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 ${showExpenseForm ? 'bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'}`}
              >
                {showExpenseForm ? <X size={16} strokeWidth={2.5}/> : <Minus size={16} strokeWidth={2.5} className="text-slate-400"/>}
                {showExpenseForm ? 'Cancel' : 'Expense'}
              </button>
              <button 
                onClick={() => { setIsTransferModalOpen(true); setShowExpenseForm(false); setShowWithdrawForm(false); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <ArrowUpRight size={16} strokeWidth={2.5}/>
                Transfer
              </button>
            </div>
          </div>

          {/* Inline Smooth Expense Form */}
          {showExpenseForm && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Record New Expense</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount (LKR)</label>
                  <input type="number" placeholder="e.g. 2500" value={expenseData.amount} onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select value={expenseData.category} onChange={(e) => setExpenseData({...expenseData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all cursor-pointer">
                    <option value="Plant Accessories">Plant Accessories (Pots, Soil)</option>
                    <option value="Logistics">Logistics & Delivery</option>
                    <option value="Marketing">Marketing & Ads</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Debit From Account</label>
                  <select value={expenseData.account_name} onChange={(e) => setExpenseData({...expenseData, account_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all cursor-pointer">
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Description</label>
                  <input type="text" placeholder="e.g. Bought 50 terracotta pots from Kandy" value={expenseData.description} onChange={(e) => setExpenseData({...expenseData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all" />
                </div>
              </div>
              <button onClick={handleAddExpense} className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98] shadow-md cursor-pointer">
                Save Expense Record
              </button>
            </div>
          )}
          
          {/* Inline Smooth Withdraw Form (Matching Expense Form UI) */}
          {showWithdrawForm && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 mb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Capital Withdrawal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount (LKR)</label>
                  <input type="number" placeholder="e.g. 5000" value={withdrawData.amount} onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Allocation</label>
                  <select value={withdrawData.category} onChange={(e) => setWithdrawData({...withdrawData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all cursor-pointer">
                    <option value="Personal Use">Personal Use</option>
                    <option value="Market Investments">Market Investments</option>
                    <option value="Savings">Savings</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Debit From Account</label>
                  <select value={withdrawData.account_name} onChange={(e) => setWithdrawData({...withdrawData, account_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all cursor-pointer">
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Memo / Note</label>
                  <input type="text" placeholder="e.g. Withdrew for CDS deposit" value={withdrawData.description} onChange={(e) => setWithdrawData({...withdrawData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all" />
                </div>
              </div>
              <button onClick={handleWithdraw} className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98] shadow-md cursor-pointer">
                Confirm Withdrawal
              </button>
            </div>
          )}

          {/* Premium Main Balance Card */}
          <div className="bg-[#0B1121] rounded-3xl p-7 shadow-xl relative overflow-hidden mt-2">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/10 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Available Balance</p>
                <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                  LKR {currentBalance.toLocaleString()}
                </h1>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-300 backdrop-blur-sm">
                <Wallet size={20} strokeWidth={2}/>
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 pt-6 border-t border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><ArrowUpRight size={12} strokeWidth={3}/></div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Income</p>
                </div>
                <p className="text-lg font-semibold text-slate-200">LKR {totalIncome.toLocaleString()}</p>
              </div>
              <div className="pl-4 border-l border-slate-800/80">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400"><ArrowDownRight size={12} strokeWidth={3}/></div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Expenses</p>
                </div>
                <p className="text-lg font-semibold text-slate-200">LKR {totalExpense.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* ---- ACCOUNTS OVERVIEW SECTION ---- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Accounts Overview</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Net balance per wallet</p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-indigo-100 transition-all cursor-pointer"
              >
                <ArrowUpRight size={12} strokeWidth={3}/> Transfer
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cash in Hand */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-emerald-300 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-6 -mt-6"/>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Wallet size={15} strokeWidth={2.5}/>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cash in Hand</p>
                </div>
                <p className={`text-xl font-black tracking-tight ${cashBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  LKR {Math.abs(cashBalance).toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{cashBalance >= 0 ? 'Available' : 'Deficit'}</p>
              </div>

              {/* Bank Account */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-300 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-6 -mt-6"/>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <CreditCard size={15} strokeWidth={2.5}/>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bank Account</p>
                </div>
                <p className={`text-xl font-black tracking-tight ${bankBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  LKR {Math.abs(bankBalance).toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{bankBalance >= 0 ? 'Available' : 'Deficit'}</p>
              </div>

              {/* COD Pending */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-amber-300 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-6 -mt-6"/>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Activity size={15} strokeWidth={2.5}/>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COD Pending</p>
                </div>
                <p className={`text-xl font-black tracking-tight ${codBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  LKR {Math.abs(codBalance).toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{codBalance >= 0 ? 'In Transit' : 'Deficit'}</p>
              </div>
            </div>
          </div>

          {/* Financial Metrics Mini-Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div onClick={() => setActiveMetricModal('margin')} className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-blue-400"/></div>
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Activity size={18} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Profit Margin</p>
                <p className="text-base font-semibold text-slate-900">{profitMargin}%</p>
              </div>
            </div>
            
            <div onClick={() => setActiveMetricModal('growth')} className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowUpRight size={14} className="text-emerald-400"/></div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${monthlyGrowth >= 0 ? 'bg-emerald-50 border border-emerald-100 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-rose-50 border border-rose-100 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'}`}>
                <TrendingUp size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Monthly Growth</p>
                <p className={`text-base font-semibold ${monthlyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth}%
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"><CreditCard size={18} strokeWidth={2.5}/></div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Transactions</p>
                <p className="text-base font-semibold text-slate-900">{transactions.length}</p>
              </div>
            </div>
          </div>

          {/* Income & Expense Analytics (Meta Business Suite Style) */}
          <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm mt-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Income & Expense Analytics</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Earnings vs outflows comparison</p>
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setWalletFilter(opt)}
                    className={`px-3 py-1.5 text-[9px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                      walletFilter === opt 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={walletChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="walletIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="walletExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} 
                    formatter={(value) => `LKR ${value.toLocaleString()}`} 
                  />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#walletIncome)" />
                  <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#walletExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outflow Distribution Chart */}
          {expenseDistribution.length > 0 && (
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm mt-2">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Outflow Distribution</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Expenses & Allocations</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                  <PieChartIcon size={16}/>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                        {expenseDistribution.map((entry, index) => (
                          <Cell key={'cell-'+index} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 12px' }} itemStyle={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }} formatter={(value) => `LKR ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3">
                  {expenseDistribution.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}></div>
                        <span className="font-semibold text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">LKR {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Ledger */}
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm mt-2">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Transaction Ledger</h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">No transactions yet.</div>
              ) : (
                transactions.map((t, i) => (
                  <div key={t.id || i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'Income' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownRight size={18} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.category}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[150px] md:max-w-xs">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {t.account_name && (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              t.account_name === 'Cash in Hand' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              t.account_name === 'Bank Account' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>{t.account_name}</span>
                          )}
                          {t.date && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar size={10} className="text-slate-400" />
                              {formatDate(t.date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {t.type === 'Income' ? '+' : '-'} {t.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 border-l border-slate-100 pl-3">
                        <button 
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeMetricModal && (
            <div 
              onClick={() => setActiveMetricModal(null)} 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
            >
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-white rounded-[2rem] p-7 w-full max-w-lg shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] relative animate-in zoom-in-95 duration-300 border border-slate-100/50"
              >
                <button onClick={() => setActiveMetricModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full transition-all shadow-sm">
                  <X size={18} strokeWidth={2.5}/>
                </button>
                
                <div className="mb-7 pl-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {activeMetricModal === 'margin' ? 'Profit vs Expenses' : 'Revenue Growth'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    {activeMetricModal === 'margin' ? 'All-time capital distribution' : 'Last 6 months performance trend'}
                  </p>
                </div>

                <div className="h-[280px] w-full">
                  {activeMetricModal === 'margin' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={1}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#e11d48" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                        <Pie data={marginChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={6} dataKey="value" stroke="none">
                          <Cell fill="url(#colorProfit)"/>
                          <Cell fill="url(#colorExpense)"/>
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} itemStyle={{ fontWeight: 800, fontSize: '14px' }} formatter={(value) => `LKR ${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} labelStyle={{ color: '#64748b', fontWeight: 700, marginBottom: '4px' }} formatter={(value) => [`LKR ${value.toLocaleString()}`, 'Revenue']} />
                        <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {activeMetricModal === 'margin' && (
                  <div className="flex justify-center gap-6 mt-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>Net Profit</span>
                    <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm"></div>Expenses</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      )}
      {/* BANK ACCOUNTS TAB */}
      {activeTab === 'bank' && (
        <main className="px-4 md:px-8 pt-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-32 min-h-screen">
          <div className="flex items-end justify-between border-b border-slate-200/60 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h2>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Multi-Wallet Overview</p>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="bg-[#0b0f19] text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"/>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-600/10 rounded-full blur-[50px] pointer-events-none"/>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Combined Net Balance</p>
              <p className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">LKR {(cashBalance + bankBalance + codBalance).toLocaleString()}</p>
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-slate-800/80">
                <div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cash in Hand</p><p className={`text-sm font-bold ${cashBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>LKR {cashBalance.toLocaleString()}</p></div>
                <div className="border-l border-slate-800 pl-6"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bank Account</p><p className={`text-sm font-bold ${bankBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>LKR {bankBalance.toLocaleString()}</p></div>
                <div className="border-l border-slate-800 pl-6"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">COD Pending</p><p className={`text-sm font-bold ${codBalance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>LKR {codBalance.toLocaleString()}</p></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0b1121] rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-emerald-800/60 transition-all"><div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-colors"/><div className="relative z-10"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><Wallet size={18} strokeWidth={2}/></div><span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${cashBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{cashBalance >= 0 ? 'Active' : 'Deficit'}</span></div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cash in Hand</p><p className={`text-2xl font-black tracking-tight ${cashBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>LKR {Math.abs(cashBalance).toLocaleString()}</p><div className="mt-3 pt-3 border-t border-slate-800"><p className="text-[9px] text-slate-600 font-semibold">{transactions.filter(t => t.account_name === 'Cash in Hand').length} transactions</p></div></div></div>
            <div className="bg-[#0b1121] rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-800/60 transition-all"><div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-colors"/><div className="relative z-10"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Building2 size={18} strokeWidth={2}/></div><span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${bankBalance >= 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{bankBalance >= 0 ? 'Active' : 'Deficit'}</span></div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Bank Account</p><p className={`text-2xl font-black tracking-tight ${bankBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>LKR {Math.abs(bankBalance).toLocaleString()}</p><div className="mt-3 pt-3 border-t border-slate-800"><p className="text-[9px] text-slate-600 font-semibold">{transactions.filter(t => t.account_name === 'Bank Account').length} transactions</p></div></div></div>
            <div className="bg-[#0b1121] rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-amber-800/60 transition-all"><div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-8 -mt-8 group-hover:bg-amber-500/20 transition-colors"/><div className="relative z-10"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400"><Activity size={18} strokeWidth={2}/></div><span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${codBalance >= 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{codBalance >= 0 ? 'In Transit' : 'Deficit'}</span></div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">COD Pending</p><p className={`text-2xl font-black tracking-tight ${codBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>LKR {Math.abs(codBalance).toLocaleString()}</p><div className="mt-3 pt-3 border-t border-slate-800"><p className="text-[9px] text-slate-600 font-semibold">{transactions.filter(t => t.account_name === 'COD Pending').length} transactions</p></div></div></div>
          </div>

          {/* MONTH END SETTLEMENT BANNER */}
          <div className="bg-[#0b1121] rounded-3xl p-6 border border-emerald-500/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2 group hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/20 transition-all"/>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-[50px] pointer-events-none"/>
            <div className="relative z-10 flex flex-col">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex shrink-0 items-center justify-center border border-emerald-500/20"><CheckCircle size={22} className="text-emerald-400"/></div> 
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Month End Settlement</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Move all available Cash in Hand to your Bank Account</p>
                </div>
              </div>
            </div>
            <div className="relative z-10">
              <button onClick={handleMonthEndSettlement} disabled={cashBalance <= 0} className={`w-full md:w-auto px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 whitespace-nowrap ${cashBalance > 0 ? 'bg-emerald-500 hover:bg-emerald-400 text-[#0b1121] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-[0.98]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                Settle LKR {Math.max(0, cashBalance).toLocaleString()} <ArrowUpRight size={18} strokeWidth={2.5}/>
              </button>
            </div>
          </div>

          <div className="bg-[#0b1121] rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none"/>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400"><ArrowLeftRight size={18} strokeWidth={2}/></div><div><h3 className="text-sm font-black text-white tracking-tight">Transfer Money</h3><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Move funds between wallets</p></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">From Account</label><select value={transferData.fromAccount} onChange={(e) => setTransferData({...transferData, fromAccount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all cursor-pointer">{ACCOUNTS.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}</select></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">To Account</label><select value={transferData.toAccount} onChange={(e) => setTransferData({...transferData, toAccount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all cursor-pointer">{ACCOUNTS.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}</select></div>
              </div>
              <div className="mb-4"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount (LKR)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">LKR</span><input type="number" placeholder="0.00" value={transferData.amount} onChange={(e) => setTransferData({...transferData, amount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-14 pr-4 py-4 text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-700"/></div></div>
              <div className="mb-5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Note (Optional)</label><input type="text" placeholder="e.g. Moving cash to bank for savings" value={transferData.description} onChange={(e) => setTransferData({...transferData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-700"/></div>
              {transferData.fromAccount === transferData.toAccount && (<p className="text-[11px] font-bold text-rose-400 mb-3 text-center">Source and destination must differ</p>)}
              <button onClick={handleTransfer} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"><ArrowLeftRight size={16} strokeWidth={2.5}/> Confirm Transfer</button>
            </div>
          </div>
          <div className="bg-[#0b1121] rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3"><div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><RefreshCw size={13} strokeWidth={2.5}/></div><div><h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">Account Ledger</h3><p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Transaction history by wallet</p></div></div>
            {[{label:'Cash in Hand',balance:cashBalance,ac:'text-emerald-400',icon:<Wallet size={13} strokeWidth={2}/>},{label:'Bank Account',balance:bankBalance,ac:'text-blue-400',icon:<Building2 size={13} strokeWidth={2}/>},{label:'COD Pending',balance:codBalance,ac:'text-amber-400',icon:<Activity size={13} strokeWidth={2}/>}].map(({label,balance,ac,icon})=>{const acctTxns=transactions.filter(t=>t.account_name===label);return(<div key={label} className="border-b border-slate-800 last:border-0"><div className="px-6 py-3 flex items-center justify-between bg-slate-900/50"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div><span className={`text-xs font-black ${balance>=0?ac:'text-rose-400'}`}>Net: LKR {balance.toLocaleString()}</span></div>{acctTxns.length===0?(<div className="px-6 py-5 text-center text-slate-700 text-xs font-semibold">No activity yet</div>):(<div className="divide-y divide-slate-800/40 max-h-[220px] overflow-y-auto">{acctTxns.map((t,i)=>(<div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"><div className="flex items-center gap-3"><div className={`w-7 h-7 rounded-full flex items-center justify-center ${t.type==='Income'?'bg-emerald-500/10 text-emerald-400':'bg-rose-500/10 text-rose-400'}`}>{t.type==='Income'?<ArrowUpRight size={13} strokeWidth={2.5}/>:<ArrowDownRight size={13} strokeWidth={2.5}/>}</div><div><p className="text-xs font-bold text-slate-300">{t.category}</p><p className="text-[9px] text-slate-600 font-semibold truncate max-w-[150px] md:max-w-xs">{t.description||'—'}</p></div></div><p className={`text-xs font-bold ${t.type==='Income'?'text-emerald-400':'text-slate-500'}`}>{t.type==='Income'?'+':'-'} LKR {t.amount.toLocaleString()}</p></div>))}</div>)}</div>);})}
          </div>
        </main>
      )}

      {/* Corporate/Clean Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 py-2 pb-safe z-40 print:hidden">
        <nav className="flex justify-between items-center w-full max-w-lg mx-auto">
          <button 
            onClick={() => { setActiveTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className={`flex flex-col items-center gap-1 p-2 w-12 transition-colors cursor-pointer ${activeTab === 'home' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}>
            <Home size={20} strokeWidth={2} />
            <span className="text-[9px] font-semibold tracking-wider">Home</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('bills'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className={`flex flex-col items-center gap-1 p-2 w-12 transition-colors cursor-pointer ${activeTab === 'bills' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}>
            <ReceiptText size={20} strokeWidth={2} />
            <span className="text-[9px] font-semibold tracking-wider">Bills</span>
          </button>

          <div className="relative -mt-8 flex-shrink-0">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-800 active:scale-95 transition-all text-white border-4 border-[#F8FAFC] cursor-pointer">
              <Plus size={24} strokeWidth={2} />
            </button>
          </div>

          <button 
            onClick={() => { setActiveTab('crm'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center gap-1 p-2 w-12 transition-colors cursor-pointer ${activeTab === 'crm' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}>
            <Users size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-semibold tracking-wider">CRM</span>
          </button>

          <button 
            onClick={() => { setActiveTab('wallet'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center gap-1 p-2 w-12 transition-colors cursor-pointer ${activeTab === 'wallet' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}>
            <Wallet size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-semibold tracking-wider">Finance</span>
          </button>

          <button 
            onClick={() => { setActiveTab('bank'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center gap-1 p-2 w-12 transition-colors cursor-pointer ${activeTab === 'bank' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-900'}`}>
            <Building2 size={20} strokeWidth={1.5} />
            <span className="text-[9px] font-semibold tracking-wider">Accounts</span>
          </button>
        </nav>
      </div>

      {/* --- ADD TRANSACTION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-md bg-white rounded-xl p-8 shadow-2xl transition-all scale-100 opacity-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-bold text-slate-950 tracking-tight">Add Transaction</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 bg-slate-100 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-md">
                <button
                  type="button"
                  className={`py-2.5 text-xs font-bold rounded transition-all uppercase tracking-wider cursor-pointer ${txType === 'Income' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => handleTypeChange('Income')}
                >
                  Income
                </button>
                <button
                  type="button"
                  className={`py-2.5 text-xs font-bold rounded transition-all uppercase tracking-wider cursor-pointer ${txType === 'Expense' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => handleTypeChange('Expense')}
                >
                  Expense
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">LKR</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-100/50 rounded py-4 pl-14 pr-4 text-3xl font-semibold text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-300 cursor-text"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Category</label>
                  <select
                    value={categorySelect}
                    onChange={(e) => setCategorySelect(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-100/50 rounded-md px-4 py-3 text-sm font-medium text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select category...</option>
                    {currentCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {categorySelect === 'Other' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-sm font-medium text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400 cursor-text"
                      placeholder="Type custom category..."
                      autoFocus
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-100/50 rounded-md px-4 py-3 text-sm font-medium text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400 cursor-text"
                  placeholder="e.g. Received payment for succulents"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5 block">Account / Wallet</label>
                <select
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-100/50 rounded-md px-4 py-3 text-sm font-medium text-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 focus:bg-white transition-all cursor-pointer"
                >
                  {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="pt-3">
                <button 
                  type="submit"
                  className="w-full bg-zinc-950 text-white rounded-md py-4 text-sm font-bold tracking-wide hover:bg-zinc-800 active:scale-[0.99] transition-all shadow-md shadow-zinc-950/10 cursor-pointer"
                >
                  Confirm Transaction
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}

      {/* --- TRANSFER MONEY MODAL --- */}
      {isTransferModalOpen && (
        <div onClick={() => setIsTransferModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-300">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] p-7 w-full max-w-md shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] relative animate-in zoom-in-95 duration-300 border border-slate-100">
            <button onClick={() => setIsTransferModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full transition-all cursor-pointer">
              <X size={18} strokeWidth={2.5}/>
            </button>
            <div className="mb-6 pl-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <ArrowUpRight size={18} strokeWidth={2.5}/>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Transfer Money</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Move funds between accounts</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">From Account</label>
                  <select
                    value={transferData.fromAccount}
                    onChange={(e) => setTransferData({...transferData, fromAccount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">To Account</label>
                  <select
                    value={transferData.toAccount}
                    onChange={(e) => setTransferData({...transferData, toAccount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Amount (LKR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">LKR</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-14 pr-4 py-4 text-2xl font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Moving cash to bank for savings"
                  value={transferData.description}
                  onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition-all placeholder:text-slate-400"
                />
              </div>

              {transferData.fromAccount === transferData.toAccount && (
                <p className="text-[11px] font-bold text-rose-500 text-center py-1">Source and destination accounts must be different</p>
              )}

              <button
                onClick={handleTransfer}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 cursor-pointer mt-2"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setDeleteConfirmId(null)}
          ></div>
          
          <div className="relative w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Delete Transaction?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this transaction? This action cannot be undone.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold tracking-wide rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold tracking-wide rounded-lg transition-colors shadow-md shadow-red-500/20 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM CLIENT DELETE CONFIRMATION MODAL --- */}
      {deleteCustomerConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setDeleteCustomerConfirmId(null)}
          ></div>
          
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Delete Client?</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">Are you sure you want to delete this client? This action will permanently remove their records and cannot be undone.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteCustomerConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteCustomer}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wide rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM PENDING BILL DELETE CONFIRMATION MODAL --- */}
      {deletePendingBillConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setDeletePendingBillConfirmId(null)}
          ></div>
          
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">Remove Pending Delivery?</h3>
            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">Are you sure you want to remove this pending delivery? This will remove it from the list without adding it to transactions.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletePendingBillConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wide rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeletePendingBill}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wide rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer active:scale-[0.98]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Slide-out Notification Drawer */}
      {isNotificationOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsNotificationOpen(false)}
          ></div>

          {/* Drawer Sidebar Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
                    <Bell size={15} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Alert Center</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Real-time notifications</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClearAllNotifications}
                      className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setIsNotificationOpen(false)}
                    className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Drawer Body - Notification Feed */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4">
                      <Check size={20} strokeWidth={2.5} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">All Caught Up</h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1 max-w-[200px]">No active notifications. Everything is running smoothly!</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-2xl border flex gap-3.5 relative group overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                        n.type === 'danger' ? 'bg-red-50/40 border-red-100 text-red-900' :
                        n.type === 'warning' ? 'bg-amber-50/40 border-amber-100 text-amber-900' :
                        n.type === 'success' ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' :
                        n.type === 'birthday' ? 'bg-purple-50/40 border-purple-100 text-purple-900' :
                        'bg-blue-50/40 border-blue-100 text-blue-900'
                      }`}
                    >
                      {/* Left icon wrapper */}
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                          n.type === 'danger' ? 'bg-red-100 border border-red-200 text-red-600' :
                          n.type === 'warning' ? 'bg-amber-100 border border-amber-200 text-amber-600' :
                          n.type === 'success' ? 'bg-emerald-100 border border-emerald-200 text-emerald-600' :
                          n.type === 'birthday' ? 'bg-purple-100 border border-purple-200 text-purple-600' :
                          'bg-blue-100 border border-blue-200 text-blue-600'
                        }`}>
                          {n.type === 'danger' ? <AlertTriangle size={14} strokeWidth={2.5} /> :
                           n.type === 'warning' ? <AlertTriangle size={14} strokeWidth={2.5} /> :
                           n.type === 'success' ? <CheckCircle size={14} strokeWidth={2.5} /> :
                           n.type === 'birthday' ? <Gift size={14} strokeWidth={2.5} /> :
                           <Bell size={14} strokeWidth={2.5} />}
                        </div>
                      </div>
                      
                      {/* Message content */}
                      <div className="flex-1 pr-4">
                        <h4 className="font-black text-xs text-slate-900 tracking-tight">{n.title}</h4>
                        <p className="text-slate-600 font-semibold text-[11px] mt-1 leading-relaxed">{n.message}</p>
                        {n.date && (
                          <div className="flex items-center gap-1 mt-2.5">
                            <Calendar size={10} className="text-slate-400" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{n.date}</span>
                          </div>
                        )}
                      </div>

                      {/* Clear Button (appears on hover / screen touch) */}
                      <button 
                        onClick={() => handleDismissNotification(n.id)}
                        className="absolute top-3.5 right-3.5 text-slate-300 hover:text-slate-900 md:opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-slate-100 rounded-md cursor-pointer"
                        title="Dismiss"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isClientModalOpen && (
        <div onClick={() => setIsClientModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] p-7 w-full max-w-lg shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsClientModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-full transition-all cursor-pointer">
              <X size={18} strokeWidth={2.5}/>
            </button>
            <div className="mb-6 pl-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {editingClient ? 'Edit Client Details' : 'Add New Client'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                {editingClient ? 'Modify customer directory profile' : 'Insert a new customer profile into database'}
              </p>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Client Name *</label>
                <input 
                  type="text" 
                  required
                  value={clientFormData.name || ''} 
                  onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})} 
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Address Line 1</label>
                  <input 
                    type="text" 
                    value={clientFormData.addressLine1 || ''} 
                    onChange={(e) => setClientFormData({...clientFormData, addressLine1: e.target.value})} 
                    placeholder="Orchid Lane"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Address Line 2</label>
                  <input 
                    type="text" 
                    value={clientFormData.addressLine2 || ''} 
                    onChange={(e) => setClientFormData({...clientFormData, addressLine2: e.target.value})} 
                    placeholder="Peradeniya Rd"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">City</label>
                  <input 
                    type="text" 
                    value={clientFormData.city || ''} 
                    onChange={(e) => setClientFormData({...clientFormData, city: e.target.value})} 
                    placeholder="Kandy"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Gender</label>
                  <select 
                    value={clientFormData.gender || 'Male'} 
                    onChange={(e) => setClientFormData({...clientFormData, gender: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Birthday (Optional)</label>
                  <input 
                    type="date" 
                    value={clientFormData.dob || ''} 
                    onChange={(e) => setClientFormData({...clientFormData, dob: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Total Spent (LKR)</label>
                  <input 
                    type="number" 
                    value={clientFormData.totalSpent || 0} 
                    onChange={(e) => setClientFormData({...clientFormData, totalSpent: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Total Orders</label>
                <input 
                  type="number" 
                  value={clientFormData.totalOrders || 0} 
                  onChange={(e) => setClientFormData({...clientFormData, totalOrders: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400"
                />
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-wide hover:bg-slate-800 transition-all active:scale-[0.98] shadow-md cursor-pointer">
                {editingClient ? 'Save Changes' : 'Create Client Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
