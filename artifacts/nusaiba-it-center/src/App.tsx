/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Table as TableIcon, 
  BarChart3, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  ChevronLeft, 
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Download,
  Plus,
  Search,
  LayoutDashboard,
  FileDown,
  Bell,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Member, MonthlyRecord, CellColor } from './types';
import { exportToExcel, exportToPDF } from '@/lib/export';

// Mock Data for Initial Launch
const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Alihsan Shourov', phone: '01709281334', isActive: true, createdAt: new Date().toISOString() },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('sheet');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 1024 : true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [officeNumber, setOfficeNumber] = useState('+880 1709 281334');

  // Local Storage persistence
  useEffect(() => {
    const savedMembers = localStorage.getItem('members');
    const savedRecords = localStorage.getItem('records');
    const savedNumber = localStorage.getItem('officeNumber');
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedNumber) setOfficeNumber(savedNumber);
  }, []);

  useEffect(() => {
    localStorage.setItem('members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('officeNumber', officeNumber);
  }, [officeNumber]);

  const monthKey = format(currentDate, 'yyyy-MM');

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const addMember = () => {
    if (!newMemberName.trim()) return toast.error("Please enter a name");
    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMemberName.trim(),
      phone: newMemberPhone.trim() || 'N/A',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddModal(false);
    toast.success(`${newMemberName} added successfully`);
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    setRecords(records.filter(r => r.memberId !== id));
    toast.info("Member removed");
  };

  const moveMember = (id: string, direction: 'up' | 'down') => {
    setMembers(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const updateRecord = (memberId: string, day: number, status: 'P' | 'A' | null) => {
    setRecords(prev => {
      const existing = prev.find(r => r.memberId === memberId && r.monthKey === monthKey);
      if (existing) {
        return prev.map(r => r === existing ? {
          ...r,
          attendance: { ...r.attendance, [day]: status },
          updatedAt: new Date().toISOString()
        } : r);
      } else {
        const newRecord: MonthlyRecord = {
          id: `${monthKey}-${memberId}`,
          memberId,
          monthKey,
          attendance: { [day]: status },
          amountMap: {},
          dollarMap: {},
          amount: 0,
          dollar: 0,
          updatedAt: new Date().toISOString()
        };
        return [...prev, newRecord];
      }
    });
  };

  const updateCollection = (memberId: string, day: number, value: number | null, type: 'amountMap' | 'dollarMap') => {
    setRecords(prev => {
      const existing = prev.find(r => r.memberId === memberId && r.monthKey === monthKey);
      const targetMap = existing ? { ...existing[type], [day]: value } : { [day]: value };
      
      // Calculate total
      const total = Object.values(targetMap).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
      const totalField = type === 'amountMap' ? 'amount' : 'dollar';

      if (existing) {
        return prev.map(r => r === existing ? {
          ...r,
          [type]: targetMap,
          [totalField]: total,
          updatedAt: new Date().toISOString()
        } : r);
      } else {
        const newRecord: MonthlyRecord = {
          id: `${monthKey}-${memberId}`,
          memberId,
          monthKey,
          attendance: {},
          amountMap: type === 'amountMap' ? targetMap : {},
          dollarMap: type === 'dollarMap' ? targetMap : {},
          amountColorMap: {},
          dollarColorMap: {},
          amount: type === 'amountMap' ? total : 0,
          dollar: type === 'dollarMap' ? total : 0,
          updatedAt: new Date().toISOString()
        };
        return [...prev, newRecord];
      }
    });
  };

  const updateCollectionColor = (memberId: string, day: number, color: CellColor, type: 'amountColorMap' | 'dollarColorMap') => {
    setRecords(prev => {
      const existing = prev.find(r => r.memberId === memberId && r.monthKey === monthKey);
      if (existing) {
        return prev.map(r => r === existing ? {
          ...r,
          [type]: { ...(r[type] || {}), [day]: color },
          updatedAt: new Date().toISOString()
        } : r);
      } else {
        const newRecord: MonthlyRecord = {
          id: `${monthKey}-${memberId}`,
          memberId,
          monthKey,
          attendance: {},
          amountMap: {},
          dollarMap: {},
          amountColorMap: type === 'amountColorMap' ? { [day]: color } : {},
          dollarColorMap: type === 'dollarColorMap' ? { [day]: color } : {},
          amount: 0,
          dollar: 0,
          updatedAt: new Date().toISOString()
        };
        return [...prev, newRecord];
      }
    });
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.phone.includes(searchQuery)
  );

  const handleExportExcel = () => {
    exportToExcel(members, monthKey);
    toast.success("Excel Exported!");
  };

  const handleExportPDF = () => {
    exportToPDF(members, monthKey);
    toast.success("PDF Exported!");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-300 font-sans">
      <Toaster position="top-right" richColors />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm border border-slate-200 dark:border-zinc-700">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">নতুন Staff যোগ করুন</h3>
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="নাম লিখুন"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <input
                type="tel"
                placeholder="ফোন নম্বর (optional)"
                value={newMemberPhone}
                onChange={e => setNewMemberPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAddModal(false); setNewMemberName(''); setNewMemberPhone(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-sm border border-slate-200 dark:border-zinc-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Member?</h3>
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  "{members.find(m => m.id === confirmDeleteId)?.name}" মুছে যাবে। এটি ফেরানো যাবে না।
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { removeMember(confirmDeleteId); setConfirmDeleteId(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <aside
        style={{ width: sidebarOpen ? 260 : 80, transition: 'width 0.1s ease' }}
        className="fixed left-0 top-0 h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 z-50 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[11px] font-black tracking-widest">NITC</span>
                </div>
                <span className="font-bold text-base tracking-tight">Nusaiba IT</span>
              </div>
            )}
            {!sidebarOpen && (
               <div className="w-9 h-9 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center cursor-pointer" onClick={() => setSidebarOpen(true)}>
                  <span className="text-white text-[10px] font-black tracking-widest">NITC</span>
                </div>
            )}
          </div>

          <nav className="flex-1 px-4 py-2 space-y-2">
            <NavItem 
              icon={<TableIcon />} 
              label="Attendance Sheet" 
              active={activeTab === 'sheet'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('sheet')}
            />
            <NavItem 
              icon={<Download />} 
              label="Dollar Collection" 
              active={activeTab === 'dollar-sheet'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('dollar-sheet')}
            />
            <NavItem 
              icon={<FileDown />} 
              label="Taka Collection" 
              active={activeTab === 'taka-sheet'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('taka-sheet')}
            />
            <NavItem 
              icon={<BarChart3 />} 
              label="Analytics" 
              active={activeTab === 'analytics'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('analytics')}
            />
            <NavItem 
              icon={<Users />} 
              label="Members" 
              active={activeTab === 'members'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('members')}
            />
            <NavItem 
              icon={<Settings />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              expanded={sidebarOpen}
              onClick={() => setActiveTab('settings')}
            />
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 space-y-4">
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                {sidebarOpen && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
              <button 
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                {sidebarOpen && <span>Logout</span>}
              </button>

              <div className="flex items-center gap-3 px-2 pt-2">
                <Avatar className="w-8 h-8 ring-2 ring-indigo-500/20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-medium">AS</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold truncate max-w-[120px]">Alihsan Shourov</span>
                    <span className="text-xs text-slate-500 dark:text-zinc-500">Admin</span>
                  </div>
                )}
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-100 ${sidebarOpen ? 'pl-[260px]' : 'pl-[80px]'} min-h-screen relative`}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search staff..." 
                className="pl-10 w-64 bg-slate-100 dark:bg-zinc-900 border-none shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button className="relative p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white dark:border-zinc-950"></span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                   <div className="flex items-center gap-2 px-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
                          AS
                      </div>
                   </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Team Access</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.05 }}
            >
              {(activeTab === 'sheet' || activeTab === 'dollar-sheet' || activeTab === 'taka-sheet') && (
                <div className="space-y-6">
                  {/* Controls */}
                  <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                      <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-lg h-9 w-9">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="px-6 font-bold text-indigo-600 dark:text-indigo-400 min-w-[160px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                      </div>
                      <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-lg h-9 w-9">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-center">
                       <Button onClick={handleExportExcel} variant="outline" className="gap-2 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm">
                        <FileDown className="w-4 h-4" />
                        Excel
                      </Button>
                      <Button onClick={handleExportPDF} variant="outline" className="gap-2 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm text-red-600 border-red-200 hover:bg-red-50">
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                      
                      <Button
                        onClick={() => setShowAddModal(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 border-none"
                      >
                        <Plus className="w-4 h-4" />
                        Add Member
                      </Button>
                    </div>
                  </div>

                  {/* The Smart Sheet */}
                  <Card className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="p-6 border-b border-slate-100 dark:border-zinc-800 text-center">
                      <h1 className="text-2xl lg:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">Nusaiba IT Center</h1>
                      <p className="text-xs text-slate-500 font-medium mt-1">Smart Attendance & Collection Management System</p>
                    </div>

                    <div className="overflow-auto h-[calc(100vh-320px)] w-full">
                      <div className="min-w-fit md:min-w-[1200px] pb-12">
                        <Table className="relative border-separate border-spacing-0">
                          <TableHeader className="sticky top-0 bg-white dark:bg-zinc-900 z-20">
                            <TableRow className="hover:bg-transparent border-slate-400 dark:border-zinc-500">
                              <TableHead className="w-[200px] sticky left-0 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-white border-r border-r-slate-400 dark:border-r-zinc-500 z-30">Staff Name</TableHead>
                              {daysInMonth.map(day => (
                                <TableHead key={day.toString()} className="w-12 p-0 text-center text-[10px] font-bold min-w-[3rem] border-r border-slate-400 dark:border-zinc-500 border-b border-b-slate-400 dark:border-b-zinc-500">
                                  {format(day, 'd')}
                                  <div className="text-[8px] opacity-40 uppercase">{format(day, 'EEE')[0]}</div>
                                </TableHead>
                              ))}
                              <TableHead className="w-[120px] text-right font-bold text-indigo-600 border-l border-l-slate-400 dark:border-l-zinc-500 bg-indigo-50/50 dark:bg-indigo-900/20 px-4 sticky right-0 z-20">
                                {activeTab === 'sheet' ? 'Present' : activeTab === 'dollar-sheet' ? 'Total $' : 'Total Taka'}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMembers.map((member) => (
                              <TableRow key={member.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors border-slate-300 dark:border-zinc-600">
                                <TableCell className="font-medium sticky left-0 bg-white dark:bg-zinc-900 z-10 border-r border-r-slate-400 dark:border-r-zinc-500 border-b border-b-slate-300 dark:border-b-zinc-600 py-1 px-2">
                                  <div className="flex items-center gap-1">
                                    <div className="flex flex-col gap-0">
                                      <button
                                        onClick={() => moveMember(member.id, 'up')}
                                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => moveMember(member.id, 'down')}
                                        className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="flex flex-col whitespace-nowrap flex-1 min-w-0">
                                      <span className="text-sm font-semibold truncate">{member.name}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">{member.phone}</span>
                                    </div>
                                    <button
                                      onClick={() => setConfirmDeleteId(member.id)}
                                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </TableCell>
                                {daysInMonth.map(day => {
                                  const dayNum = parseInt(format(day, 'd'));
                                  const record = records.find(r => r.memberId === member.id && r.monthKey === monthKey);
                                  
                                  return (
                                    <TableCell key={day.toString()} className="p-0 h-12 border-r border-r-slate-300 dark:border-r-zinc-600 border-b border-b-slate-300 dark:border-b-zinc-600 min-w-[3rem]">
                                      {activeTab === 'sheet' ? (
                                        <AttendanceCell 
                                          status={record?.attendance[dayNum] || null} 
                                          onChange={(newStatus) => updateRecord(member.id, dayNum, newStatus)} 
                                        />
                                      ) : (
                                        <CollectionCell 
                                          value={record?.[activeTab === 'dollar-sheet' ? 'dollarMap' : 'amountMap']?.[dayNum] ?? null}
                                          onChange={(val) => updateCollection(member.id, dayNum, val, activeTab === 'dollar-sheet' ? 'dollarMap' : 'amountMap')}
                                          color={(record?.[activeTab === 'dollar-sheet' ? 'dollarColorMap' : 'amountColorMap']?.[dayNum] ?? 'default') as CellColor}
                                          onColorChange={(c) => updateCollectionColor(member.id, dayNum, c, activeTab === 'dollar-sheet' ? 'dollarColorMap' : 'amountColorMap')}
                                          prefix={activeTab === 'dollar-sheet' ? '$' : '৳'}
                                        />
                                      )}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-mono text-sm border-l border-l-slate-400 dark:border-l-zinc-500 border-b border-b-slate-300 dark:border-b-zinc-600 bg-slate-50/50 dark:bg-zinc-800/20 px-4 sticky right-0 z-10">
                                  {activeTab === 'sheet' ? (
                                    <span className="text-indigo-600 font-bold">
                                      {Object.values(records.find(r => r.memberId === member.id && r.monthKey === monthKey)?.attendance || {}).filter(s => s === 'P').length}
                                    </span>
                                  ) : (
                                    <span className="text-green-600 font-bold whitespace-nowrap">
                                      {activeTab === 'dollar-sheet' ? '$' : '৳'}
                                      {(records.find(r => r.memberId === member.id && r.monthKey === monthKey)?.[activeTab === 'dollar-sheet' ? 'dollar' : 'amount'] || 0).toLocaleString()}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        {/* Footer Signatures */}
                        <div className="p-16 mt-8 flex flex-col md:flex-row items-center justify-around gap-12 border-t border-slate-100 dark:border-zinc-800 opacity-80">
                          <div className="text-center space-y-4">
                             <div className="border-t border-slate-400 dark:border-zinc-600 w-64 pt-4 font-bold text-slate-800 dark:text-zinc-200">
                               Parent / Guardian Signature
                             </div>
                             <p className="text-[10px] text-slate-400 tracking-widest uppercase">Guardian identity confirmation</p>
                          </div>
                           <div className="text-center space-y-4">
                             <div className="border-t border-slate-400 dark:border-zinc-600 w-64 pt-4 font-bold text-slate-800 dark:text-zinc-200">
                               Authorized Authority Signature
                             </div>
                             <p className="text-[12px] text-zinc-500 font-mono font-bold">Office Number: {officeNumber}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card className="border-slate-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle>Yearly Collection Trend</CardTitle>
                      <CardDescription>Performance comparison across months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={DUMMY_CHART_DATA}>
                          <defs>
                            <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip />
                          <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                   <Card className="border-slate-200 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle>Monthly Attendance Rate</CardTitle>
                      <CardDescription>Overall team presence percentage</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={DUMMY_CHART_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip />
                          <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-8">
                  <Card className="border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="bg-indigo-600 text-white">
                      <CardTitle className="text-xl">System Settings</CardTitle>
                      <CardDescription className="text-indigo-100">Configure global application variables</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Office Official Phone Number</label>
                        <div className="flex gap-2">
                          <Input 
                            value={officeNumber}
                            onChange={(e) => setOfficeNumber(e.target.value)}
                            placeholder="Enter office number..."
                            className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 h-12 text-lg font-mono focus-visible:ring-indigo-600"
                          />
                          <Button 
                            className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => toast.success("Office number updated!")}
                          >
                            Update
                          </Button>
                        </div>
                        <p className="text-xs text-slate-400">This number will appear at the bottom of all exported PDF/Excel sheets.</p>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                        <h4 className="font-bold text-slate-800 dark:text-zinc-200 mb-4">Application Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                            <span className="block text-xs text-slate-400 mb-1 uppercase">Version</span>
                            <span className="font-mono font-bold text-indigo-600">v1.2.0 (Stable)</span>
                          </div>
                           <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                            <span className="block text-xs text-slate-400 mb-1 uppercase">Developer</span>
                            <span className="font-bold">Alihsan Shourov</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, expanded }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, expanded: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm' 
          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'}
      `}
      title={label}
    >
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
        {icon}
      </div>
      {expanded && <span className="font-semibold text-sm">{label}</span>}
      {active && expanded && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
      )}
    </button>
  );
}

function AttendanceCell({ status, onChange }: { status: 'P' | 'A' | null, onChange: (status: 'P' | 'A' | null) => void }) {
  const toggleStatus = () => {
    if (status === null) onChange('P');
    else if (status === 'P') onChange('A');
    else onChange(null);
  };

  return (
    <button 
      onClick={toggleStatus}
      className={`
        w-full h-full flex items-center justify-center text-[11px] font-black transition-all
        ${status === 'P' ? 'bg-white text-gray-900 border border-gray-200' : ''}
        ${status === 'A' ? 'bg-red-600 text-white' : ''}
        ${status === null ? 'hover:bg-slate-100 dark:hover:bg-zinc-700 text-transparent' : ''}
      `}
    >
      {status}
    </button>
  );
}

const COLOR_CYCLE: CellColor[] = ['default', 'red', 'blue', 'green', 'yellow'];

const COLOR_STYLES: Record<CellColor, string> = {
  default: 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white',
  red:     'bg-red-500 text-white',
  blue:    'bg-blue-500 text-white',
  green:   'bg-green-500 text-white',
  yellow:  'bg-yellow-400 text-slate-900',
};

function CollectionCell({ value, onChange, prefix, color, onColorChange }: { 
  value: number | null; 
  onChange: (val: number | null) => void; 
  prefix: string;
  color: CellColor;
  onColorChange: (c: CellColor) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value?.toString() || '');
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const num = parseFloat(inputValue);
    onChange(isNaN(num) ? null : num);
  };

  const handleClick = () => {
    clickCount.current += 1;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
        setIsEditing(true);
      }, 250);
    } else {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      const idx = COLOR_CYCLE.indexOf(color);
      const next = COLOR_CYCLE[(idx + 1) % COLOR_CYCLE.length];
      onColorChange(next);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleClick();
  };

  const cellStyle = value != null ? COLOR_STYLES[color] : 'text-transparent';

  if (isEditing) {
    return (
      <input
        autoFocus
        type="number"
        className="w-full min-h-[36px] text-center text-[13px] font-bold bg-white dark:bg-zinc-700 text-slate-900 dark:text-white border-none outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
      />
    );
  }

  return (
    <button
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      className={`w-full min-h-[36px] flex items-center justify-center text-[13px] font-bold font-mono transition-colors select-none ${cellStyle}`}
    >
      {value != null ? `${prefix}${value}` : ''}
    </button>
  );
}

const DUMMY_CHART_DATA = [
  { name: 'Jan', amount: 4000, attendance: 85 },
  { name: 'Feb', amount: 3000, attendance: 92 },
  { name: 'Mar', amount: 5000, attendance: 78 },
  { name: 'Apr', amount: 4500, attendance: 95 },
  { name: 'May', amount: 6000, attendance: 88 },
  { name: 'Jun', amount: 5500, attendance: 90 },
];
