import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Filter,
  Sun,
  Moon,
  AlertTriangle,
  Clock,
  Flag,
  Bell,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  Wifi,
  WifiOff,
  BarChart3,
  CheckSquare,
  Target,
  TrendingUp,
  Activity,
  Tag,
  Briefcase,
  Home,
  ShoppingCart,
  Heart,
  Zap,
  Settings,
  Edit3,
  Save,
  X
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type Priority = 'low' | 'medium' | 'high';
type Category = 'work' | 'personal' | 'shopping' | 'health' | 'learning' | 'other';

interface CategoryConfig {
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CATEGORIES: Record<Category, CategoryConfig> = {
  work: {
    name: 'Work',
    icon: Briefcase,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  personal: {
    name: 'Personal',
    icon: Home,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  shopping: {
    name: 'Shopping',
    icon: ShoppingCart,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  health: {
    name: 'Health',
    icon: Heart,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  learning: {
    name: 'Learning',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  other: {
    name: 'Other',
    icon: Tag,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    borderColor: 'border-gray-200 dark:border-gray-800'
  }
};

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  dueDate?: Date;
  priority: Priority;
  completedAt?: Date;
  category: Category;
}

interface DailyStats {
  date: string;
  completed: number;
  created: number;
  completionRate: number;
  byCategory: Record<Category, { completed: number; created: number }>;
}

type FilterType = 'all' | 'active' | 'completed' | 'overdue' | 'due-today' | 'high-priority' | 'custom-date' | Category;
type SortType = 'created' | 'due-date' | 'priority' | 'category';
type ViewType = 'todos' | 'dashboard';

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newCategory, setNewCategory] = useState<Category>('personal');
  const [filter, setFilter] = useState<FilterType>('all');
  const [customFilterDate, setCustomFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('created');
  const [darkMode, setDarkMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('todos');
  const [analytics, setAnalytics] = useState<DailyStats[]>([]);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editCategory, setEditCategory] = useState<Category>('personal');

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('daily-todos');
    if (savedTodos) {
      const parsed = JSON.parse(savedTodos);
      setTodos(parsed.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
        completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
        priority: todo.priority || 'medium',
        category: todo.category || 'personal'
      })));
    }
    
    // Load analytics
    const savedAnalytics = localStorage.getItem('daily-analytics');
    if (savedAnalytics) {
      setAnalytics(JSON.parse(savedAnalytics));
    }
    
    // Check for dark mode preference
    const isDark = localStorage.getItem('dark-mode') === 'true' || 
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Analytics functions
  const updateAnalytics = () => {
    const today = new Date().toDateString();
    const todaysTodos = todos.filter(todo => 
      todo.createdAt.toDateString() === today
    );
    const todaysCompleted = todos.filter(todo => 
      todo.completed && todo.completedAt && todo.completedAt.toDateString() === today
    );
    
    // Calculate category-wise stats
    const byCategory: Record<Category, { completed: number; created: number }> = {
      work: { completed: 0, created: 0 },
      personal: { completed: 0, created: 0 },
      shopping: { completed: 0, created: 0 },
      health: { completed: 0, created: 0 },
      learning: { completed: 0, created: 0 },
      other: { completed: 0, created: 0 }
    };
    
    todaysTodos.forEach(todo => {
      byCategory[todo.category].created++;
    });
    
    todaysCompleted.forEach(todo => {
      byCategory[todo.category].completed++;
    });
    
    const newStats: DailyStats = {
      date: today,
      created: todaysTodos.length,
      completed: todaysCompleted.length,
      completionRate: todaysTodos.length > 0 ? (todaysCompleted.length / todaysTodos.length) * 100 : 0,
      byCategory
    };
    
    setAnalytics(prev => {
      const filtered = prev.filter(stat => stat.date !== today);
      return [...filtered, newStats].slice(-30); // Keep last 30 days
    });
  };
  
  const getInsights = () => {
    const last7Days = analytics.slice(-7);
    const last30Days = analytics.slice(-30);
    
    const avgCompletionRate = last7Days.length > 0 
      ? last7Days.reduce((sum, day) => sum + day.completionRate, 0) / last7Days.length 
      : 0;
    
    const totalCompleted = last30Days.reduce((sum, day) => sum + day.completed, 0);
    const totalCreated = last30Days.reduce((sum, day) => sum + day.created, 0);
    
    const bestDay = last7Days.reduce((best, day) => 
      day.completionRate > best.completionRate ? day : best, 
      { date: '', completionRate: 0 }
    );
    
    const streak = todos.filter(todo => todo.completed).length;
    
    return {
      avgCompletionRate: Math.round(avgCompletionRate),
      totalCompleted,
      totalCreated,
      bestDay,
      streak,
      trend: last7Days.length >= 2 
        ? last7Days[last7Days.length - 1].completionRate - last7Days[0].completionRate
        : 0
    };
  };

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('daily-todos', JSON.stringify(todos));
    updateAnalytics();
  }, [todos]);
  
  // Save analytics to localStorage
  useEffect(() => {
    localStorage.setItem('daily-analytics', JSON.stringify(analytics));
  }, [analytics]);

  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallButton(true);
    };
    
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setShowInstallButton(false);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Handle URL parameters for shortcuts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const filterParam = urlParams.get('filter');
    
    if (action === 'add') {
      setShowAddForm(true);
    }
    
    if (filterParam && ['overdue', 'due-today', 'high-priority'].includes(filterParam)) {
      setFilter(filterParam as FilterType);
    }
  }, []);

  // PWA install handler
  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    const result = await installPrompt.prompt();
    console.log('Install prompt result:', result);
    
    setInstallPrompt(null);
    setShowInstallButton(false);
  };
  
  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      todos.forEach(todo => {
        if (!todo.completed && todo.dueDate) {
          const timeUntilDue = todo.dueDate.getTime() - now.getTime();
          
          // Notify if due in 30 minutes or overdue
          if (timeUntilDue <= 30 * 60 * 1000 && timeUntilDue > -60 * 60 * 1000) {
            if ('Notification' in window && Notification.permission === 'granted') {
              const isOverdue = timeUntilDue < 0;
              new Notification(
                isOverdue ? '⚠️ Overdue Task!' : '⏰ Task Due Soon!',
                {
                  body: `${todo.text}${isOverdue ? ' is overdue' : ' is due in 30 minutes'}`,
                  icon: '/vite.svg',
                  tag: todo.id // Prevent duplicate notifications
                }
              );
            }
          }
        }
      });
    };
    
    const interval = setInterval(checkReminders, 5 * 60 * 1000); // Check every 5 minutes
    checkReminders(); // Check immediately
    
    return () => clearInterval(interval);
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        completed: false,
        createdAt: new Date(),
        dueDate: newDueDate ? new Date(newDueDate) : undefined,
        priority: newPriority,
        category: newCategory
      };
      setTodos([todo, ...todos]);
      setNewTodo('');
      setNewDueDate('');
      setNewPriority('medium');
      setNewCategory('personal');
      setShowAddForm(false);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        return { 
          ...todo, 
          completed: !todo.completed,
          completedAt: !todo.completed ? new Date() : undefined
        };
      }
      return todo;
    }));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Check if a task can be edited (only today's tasks)
  const canEditTodo = (todo: Todo) => {
    const today = new Date();
    const todoDate = new Date(todo.createdAt);
    return todoDate.toDateString() === today.toDateString();
  };

  // Start editing a task
  const startEditTodo = (todo: Todo) => {
    if (!canEditTodo(todo)) return;
    
    setEditingTodo(todo.id);
    setEditText(todo.text);
    setEditDueDate(todo.dueDate ? todo.dueDate.toISOString().slice(0, 16) : '');
    setEditPriority(todo.priority);
    setEditCategory(todo.category);
  };

  // Save edited task
  const saveEditTodo = () => {
    if (!editingTodo || !editText.trim()) return;

    setTodos(todos.map(todo => {
      if (todo.id === editingTodo) {
        return {
          ...todo,
          text: editText.trim(),
          dueDate: editDueDate ? new Date(editDueDate) : undefined,
          priority: editPriority,
          category: editCategory
        };
      }
      return todo;
    }));

    cancelEditTodo();
  };

  // Cancel editing
  const cancelEditTodo = () => {
    setEditingTodo(null);
    setEditText('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditCategory('personal');
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('dark-mode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  // Utility functions
  const isOverdue = (todo: Todo) => {
    if (!todo.dueDate || todo.completed) return false;
    return todo.dueDate < new Date();
  };
  
  const isDueToday = (todo: Todo) => {
    if (!todo.dueDate || todo.completed) return false;
    const today = new Date();
    const due = new Date(todo.dueDate);
    return due.toDateString() === today.toDateString();
  };
  
  const matchesCustomDate = (todo: Todo, customDate: string) => {
    if (!customDate) return false;
    const filterDate = new Date(customDate);
    
    // Check if todo was created on this date
    const createdMatch = todo.createdAt.toDateString() === filterDate.toDateString();
    
    // Check if todo is due on this date
    const dueMatch = todo.dueDate && todo.dueDate.toDateString() === filterDate.toDateString();
    
    // Check if todo was completed on this date
    const completedMatch = todo.completedAt && todo.completedAt.toDateString() === filterDate.toDateString();
    
    return createdMatch || dueMatch || completedMatch;
  };
  
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'text-red-500 border-red-200 dark:border-red-800';
      case 'medium': return 'text-yellow-500 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-green-500 border-green-200 dark:border-green-800';
    }
  };
  
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'high': return <ArrowUp className="w-4 h-4" />;
      case 'medium': return <Minus className="w-4 h-4" />;
      case 'low': return <ArrowDown className="w-4 h-4" />;
    }
  };
  
  // Filter todos
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active': return !todo.completed;
      case 'completed': return todo.completed;
      case 'overdue': return isOverdue(todo);
      case 'due-today': return isDueToday(todo);
      case 'high-priority': return todo.priority === 'high' && !todo.completed;
      case 'custom-date': return matchesCustomDate(todo, customFilterDate);
      case 'work':
      case 'personal':
      case 'shopping':
      case 'health':
      case 'learning':
      case 'other':
        return todo.category === filter;
      default: return true;
    }
  });
  
  // Sort todos
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    switch (sortBy) {
      case 'due-date':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
    overdue: todos.filter(t => isOverdue(t)).length,
    dueToday: todos.filter(t => isDueToday(t)).length,
    highPriority: todos.filter(t => t.priority === 'high' && !t.completed).length,
    byCategory: {
      work: todos.filter(t => t.category === 'work' && !t.completed).length,
      personal: todos.filter(t => t.category === 'personal' && !t.completed).length,
      shopping: todos.filter(t => t.category === 'shopping' && !t.completed).length,
      health: todos.filter(t => t.category === 'health' && !t.completed).length,
      learning: todos.filter(t => t.category === 'learning' && !t.completed).length,
      other: todos.filter(t => t.category === 'other' && !t.completed).length
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">{today}</span>
              </div>
              
              {/* Online/Offline indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                isOnline 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Install button */}
              {showInstallButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleInstallClick}
                  className="bg-white/50 dark:bg-slate-800/50 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Install
                </Button>
              )}
              
              {/* Dark mode toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleDarkMode}
                className="rounded-full w-10 h-10 p-0"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              variant={currentView === 'todos' ? 'default' : 'outline'}
              onClick={() => setCurrentView('todos')}
              className={`${
                currentView === 'todos'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
              } transition-all duration-200`}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Tasks
            </Button>
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'outline'}
              onClick={() => setCurrentView('dashboard')}
              className={`${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
              } transition-all duration-200`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-600 to-indigo-600 dark:from-slate-200 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
            Daily Todo Tracker
          </h1>
          <p className="text-muted-foreground">
            {currentView === 'todos' 
              ? 'Organize your day, one task at a time'
              : 'Track your productivity and insights'
            }
            {!isOnline && <span className="block text-orange-600 dark:text-orange-400 text-sm mt-1">
              Working offline - changes will sync when connected
            </span>}
          </p>
        </div>
        
        {currentView === 'todos' ? (
          <TodoView 
            todos={sortedTodos}
            stats={stats}
            filter={filter}
            setFilter={setFilter}
            customFilterDate={customFilterDate}
            setCustomFilterDate={setCustomFilterDate}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            newTodo={newTodo}
            setNewTodo={setNewTodo}
            newDueDate={newDueDate}
            setNewDueDate={setNewDueDate}
            newPriority={newPriority}
            setNewPriority={setNewPriority}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            isOverdue={isOverdue}
            isDueToday={isDueToday}
            getPriorityColor={getPriorityColor}
            getPriorityIcon={getPriorityIcon}
            editingTodo={editingTodo}
            editText={editText}
            setEditText={setEditText}
            editDueDate={editDueDate}
            setEditDueDate={setEditDueDate}
            editPriority={editPriority}
            setEditPriority={setEditPriority}
            editCategory={editCategory}
            setEditCategory={setEditCategory}
            canEditTodo={canEditTodo}
            startEditTodo={startEditTodo}
            saveEditTodo={saveEditTodo}
            cancelEditTodo={cancelEditTodo}
          />
        ) : (
          <DashboardView 
            todos={todos} 
            analytics={analytics} 
            insights={getInsights()}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}

// Todo View Component
function TodoView({ 
  todos, stats, filter, setFilter, customFilterDate, setCustomFilterDate, sortBy, setSortBy, showAddForm, setShowAddForm,
  newTodo, setNewTodo, newDueDate, setNewDueDate, newPriority, setNewPriority,
  newCategory, setNewCategory, addTodo, toggleTodo, deleteTodo, isOverdue, isDueToday, 
  getPriorityColor, getPriorityIcon, editingTodo, editText, setEditText, editDueDate, setEditDueDate,
  editPriority, setEditPriority, editCategory, setEditCategory, canEditTodo, startEditTodo, saveEditTodo, cancelEditTodo
}: any) {
  return (
    <div>
      {/* Add Todo */}
      <Card className="p-6 mb-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50 shadow-lg">
        {!showAddForm ? (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Task
          </Button>
        ) : (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              className="bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
            
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Due Date (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500"
                />
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-foreground focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                >
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
              
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-foreground focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                >
                  {Object.entries(CATEGORIES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <option key={key} value={key}>
                        {config.name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={addTodo}
                disabled={!newTodo.trim()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTodo('');
                  setNewDueDate('');
                  setNewPriority('medium');
                  setNewCategory('personal');
                }}
                className="bg-white/50 dark:bg-slate-800/50"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-6">
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.active}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.overdue}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.dueToday}
            </div>
            <div className="text-xs text-muted-foreground">Due Today</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground">Done</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.byCategory.work}
            </div>
            <div className="text-xs text-muted-foreground">Work</div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.byCategory.personal}
            </div>
            <div className="text-xs text-muted-foreground">Personal</div>
          </div>
        </Card>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Filter Tasks
          </label>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'all', label: 'All', icon: Filter },
              { key: 'active', label: 'Active', icon: Circle },
              { key: 'completed', label: 'Done', icon: CheckCircle2 },
              { key: 'overdue', label: 'Overdue', icon: AlertTriangle },
              { key: 'due-today', label: 'Due Today', icon: Clock },
              { key: 'high-priority', label: 'High Priority', icon: Flag }
            ] as { key: FilterType; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key)}
                className={`${
                  filter === key 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                    : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
                } transition-all duration-200`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </Button>
            ))}
            
            {/* Custom Date Filter */}
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'custom-date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('custom-date')}
                className={`${
                  filter === 'custom-date' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                    : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
                } transition-all duration-200`}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Custom Date
              </Button>
              {filter === 'custom-date' && (
                <Input
                  type="date"
                  value={customFilterDate}
                  onChange={(e) => setCustomFilterDate(e.target.value)}
                  className="w-40 bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500"
                  placeholder="Select date"
                />
              )}
            </div>
            
            {/* Category filters */}
            <div className="w-full border-t border-border/20 pt-2 mt-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">Categories</div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CATEGORIES).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={key}
                      variant={filter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(key as FilterType)}
                      className={`${
                        filter === key 
                          ? `${config.bgColor} ${config.color} ${config.borderColor} shadow-md` 
                          : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80'
                      } transition-all duration-200`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {config.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-foreground focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          >
            <option value="created">Date Created</option>
            <option value="due-date">Due Date</option>
            <option value="priority">Priority</option>
            <option value="category">Category</option>
          </select>
        </div>
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {todos.length === 0 ? (
          <Card className="p-8 text-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
            <div className="text-muted-foreground">
              {filter === 'completed' ? 'No completed tasks yet' : 
               filter === 'active' ? 'No active tasks' :
               filter === 'overdue' ? 'No overdue tasks! 🎉' :
               filter === 'due-today' ? 'Nothing due today' :
               filter === 'high-priority' ? 'No high priority tasks' :
               filter === 'custom-date' ? (customFilterDate ? `No tasks found for ${new Date(customFilterDate).toLocaleDateString()}` : 'Select a date to filter tasks') :
               filter === 'work' ? 'No work tasks' :
               filter === 'personal' ? 'No personal tasks' :
               filter === 'shopping' ? 'No shopping tasks' :
               filter === 'health' ? 'No health tasks' :
               filter === 'learning' ? 'No learning tasks' :
               filter === 'other' ? 'No other tasks' :
               'No tasks yet. Add one above!'}
            </div>
          </Card>
        ) : (
          todos.map((todo, index) => {
            const overdue = isOverdue(todo);
            const dueToday = isDueToday(todo);
            const categoryConfig = CATEGORIES[todo.category];
            const CategoryIcon = categoryConfig.icon;
            
            return (
              <Card 
                key={todo.id} 
                className={`group p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5 ${
                  todo.completed 
                    ? 'opacity-75 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50' 
                    : overdue
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    : dueToday
                    ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
                    : todo.priority === 'high'
                    ? 'bg-white/70 dark:bg-slate-800/70 border-red-200/50 dark:border-red-700/50'
                    : `bg-white/70 dark:bg-slate-800/70 ${categoryConfig.borderColor}/30`
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.3s ease-out forwards'
                }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="flex-shrink-0 transition-all duration-200 hover:scale-110 mt-0.5"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-blue-500" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {editingTodo === todo.id ? (
                        <div className="flex-1 min-w-0 space-y-3">
                          <Input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditTodo();
                              if (e.key === 'Escape') cancelEditTodo();
                            }}
                            className="bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500"
                            autoFocus
                          />
                          
                          <div className="flex gap-2 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Due Date
                              </label>
                              <Input
                                type="datetime-local"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="bg-white/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:border-blue-400 dark:focus:border-blue-500 text-sm"
                              />
                            </div>
                            
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Priority
                              </label>
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as Priority)}
                                className="w-full px-2 py-1 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-foreground focus:border-blue-400 dark:focus:border-blue-500"
                              >
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🔴 High</option>
                              </select>
                            </div>
                            
                            <div className="flex-1 min-w-[120px]">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Category
                              </label>
                              <select
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value as Category)}
                                className="w-full px-2 py-1 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-foreground focus:border-blue-400 dark:focus:border-blue-500"
                              >
                                {Object.entries(CATEGORIES).map(([key, config]) => (
                                  <option key={key} value={key}>
                                    {config.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={saveEditTodo}
                              disabled={!editText.trim()}
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={cancelEditTodo}
                              size="sm"
                              className="bg-white/50 dark:bg-slate-800/50"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => canEditTodo(todo) && startEditTodo(todo)}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span 
                              className={`flex-1 min-w-0 transition-all duration-200 ${
                                todo.completed 
                                  ? 'line-through text-muted-foreground' 
                                  : 'text-foreground'
                              } ${canEditTodo(todo) ? 'hover:text-blue-600 dark:hover:text-blue-400' : ''}`}
                            >
                              {todo.text}
                            </span>
                            
                            {canEditTodo(todo) && !todo.completed && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Edit3 className="w-3 h-3 text-blue-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Category badge */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${categoryConfig.color} ${categoryConfig.bgColor} ${categoryConfig.borderColor}`}>
                        <CategoryIcon className="w-3 h-3" />
                        <span>{categoryConfig.name}</span>
                      </div>
                      
                      {/* Priority indicator */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                        {getPriorityIcon(todo.priority)}
                        <span className="capitalize">{todo.priority}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {todo.createdAt.toLocaleDateString()}
                      </div>
                      
                      {todo.dueDate && (
                        <div className={`flex items-center gap-1 ${
                          overdue ? 'text-red-600 dark:text-red-400 font-medium' :
                          dueToday ? 'text-orange-600 dark:text-orange-400 font-medium' :
                          'text-muted-foreground'
                        }`}>
                          {overdue ? <AlertTriangle className="w-3 h-3" /> : 
                           dueToday ? <Clock className="w-3 h-3" /> : 
                           <Bell className="w-3 h-3" />}
                          <span>
                            {overdue ? 'Overdue: ' : dueToday ? 'Due today: ' : 'Due: '}
                            {todo.dueDate.toLocaleDateString()} at {todo.dueDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 w-8 h-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-muted-foreground space-y-2">
        {stats.total > 0 && (
          <>
            <p>
              {stats.completed} of {stats.total} tasks completed
              {stats.completed === stats.total && stats.total > 0 && " 🎉"}
            </p>
            {stats.overdue > 0 && (
              <p className="text-red-600 dark:text-red-400 font-medium">
                ⚠️ {stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}
              </p>
            )}
            {stats.dueToday > 0 && (
              <p className="text-orange-600 dark:text-orange-400 font-medium">
                ⏰ {stats.dueToday} task{stats.dueToday > 1 ? 's' : ''} due today
              </p>
            )}
          </>
        )}
        
        {/* PWA info */}
        <div className="mt-4 pt-4 border-t border-border/20">
          <p className="text-xs opacity-75">
            📱 This app works offline and can be installed on your device
          </p>
        </div>
      </div>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ 
  todos, 
  analytics, 
  insights, 
  darkMode 
}: { 
  todos: Todo[], 
  analytics: DailyStats[], 
  insights: any,
  darkMode: boolean 
}) {
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: darkMode ? '#e2e8f0' : '#475569'
        }
      },
      title: {
        display: false,
        color: darkMode ? '#e2e8f0' : '#475569'
      },
    },
    scales: {
      y: {
        ticks: {
          color: darkMode ? '#94a3b8' : '#64748b'
        },
        grid: {
          color: darkMode ? '#334155' : '#e2e8f0'
        }
      },
      x: {
        ticks: {
          color: darkMode ? '#94a3b8' : '#64748b'
        },
        grid: {
          color: darkMode ? '#334155' : '#e2e8f0'
        }
      }
    }
  };

  // Completion trend chart data
  const trendData = {
    labels: analytics.slice(-7).map(stat => new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: [
      {
        label: 'Tasks Completed',
        data: analytics.slice(-7).map(stat => stat.completed),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Tasks Created',
        data: analytics.slice(-7).map(stat => stat.created),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
      }
    ],
  };

  // Priority distribution
  const priorityData = {
    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
    datasets: [
      {
        data: [
          todos.filter(t => t.priority === 'high').length,
          todos.filter(t => t.priority === 'medium').length,
          todos.filter(t => t.priority === 'low').length,
        ],
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#10b981',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Category distribution
  const categoryData = {
    labels: Object.values(CATEGORIES).map(cat => cat.name),
    datasets: [
      {
        data: Object.keys(CATEGORIES).map(key => 
          todos.filter(t => t.category === key).length
        ),
        backgroundColor: [
          '#3b82f6', // work - blue
          '#10b981', // personal - green  
          '#8b5cf6', // shopping - purple
          '#ef4444', // health - red
          '#f59e0b', // learning - yellow
          '#6b7280', // other - gray
        ],
        borderWidth: 0,
      },
    ],
  };

  // Completion rate by day
  const completionData = {
    labels: analytics.slice(-7).map(stat => new Date(stat.date).toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: [
      {
        label: 'Completion Rate (%)',
        data: analytics.slice(-7).map(stat => stat.completionRate),
        backgroundColor: analytics.slice(-7).map(stat => 
          stat.completionRate >= 80 ? '#10b981' : 
          stat.completionRate >= 60 ? '#f59e0b' : '#ef4444'
        ),
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Insights Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {insights.avgCompletionRate}%
            </div>
            <div className="text-xs text-muted-foreground">Avg Completion</div>
          </div>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {insights.totalCompleted}
            </div>
            <div className="text-xs text-muted-foreground">Total Completed</div>
          </div>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {insights.streak}
            </div>
            <div className="text-xs text-muted-foreground">Completion Streak</div>
          </div>
        </Card>

        <Card className="p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <div className="text-center">
            <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className={`text-2xl font-bold ${
              insights.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {insights.trend >= 0 ? '+' : ''}{Math.round(insights.trend)}%
            </div>
            <div className="text-xs text-muted-foreground">Weekly Trend</div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completion Trend */}
        <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-foreground">7-Day Trend</h3>
          {analytics.length > 0 ? (
            <Line data={trendData} options={chartOptions} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Start completing tasks to see trends!
            </div>
          )}
        </Card>

        {/* Category Distribution */}
        <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Tasks by Category</h3>
          {todos.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={categoryData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {...chartOptions.plugins.legend, position: 'bottom' as const}}}} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No tasks yet!
            </div>
          )}
        </Card>

        {/* Priority Distribution */}
        <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Tasks by Priority</h3>
          {todos.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={priorityData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {...chartOptions.plugins.legend, position: 'bottom' as const}}}} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No tasks yet!
            </div>
          )}
        </Card>

        {/* Completion Rate */}
        <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50 lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Daily Completion Rate</h3>
          {analytics.length > 0 ? (
            <Bar data={completionData} options={chartOptions} />
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Complete some tasks to see your progress!
            </div>
          )}
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Category Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(CATEGORIES).map(([key, config]) => {
            const Icon = config.icon;
            const categoryTodos = todos.filter(t => t.category === key);
            const completedCount = categoryTodos.filter(t => t.completed).length;
            const activeCount = categoryTodos.filter(t => !t.completed).length;
            
            return (
              <div key={key} className={`p-4 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
                <div className="text-center">
                  <div className={`flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full ${config.bgColor}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className={`text-lg font-bold ${config.color}`}>
                    {categoryTodos.length}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">{config.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {completedCount} done, {activeCount} active
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Productivity Insights</h3>
        <div className="space-y-3 text-sm">
          {insights.bestDay.date && (
            <p className="text-muted-foreground">
              🏆 Your best day was <span className="font-medium text-foreground">
                {new Date(insights.bestDay.date).toLocaleDateString('en-US', { weekday: 'long' })}
              </span> with {Math.round(insights.bestDay.completionRate)}% completion rate
            </p>
          )}
          
          {insights.avgCompletionRate > 0 && (
            <p className="text-muted-foreground">
              📊 Your average completion rate this week is{' '}
              <span className={`font-medium ${
                insights.avgCompletionRate >= 80 ? 'text-green-600 dark:text-green-400' :
                insights.avgCompletionRate >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {insights.avgCompletionRate}%
              </span>
              {insights.avgCompletionRate >= 80 ? ' - Excellent work! 🎉' :
               insights.avgCompletionRate >= 60 ? ' - Good progress! 👍' :
               ' - Room for improvement! 💪'}
            </p>
          )}
          
          {insights.trend !== 0 && (
            <p className="text-muted-foreground">
              {insights.trend > 0 ? '📈' : '📉'} Your productivity is{' '}
              <span className={`font-medium ${
                insights.trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {insights.trend > 0 ? 'trending up' : 'trending down'}
              </span>{' '}
              by {Math.abs(Math.round(insights.trend))}% this week
            </p>
          )}
          
          {insights.totalCompleted === 0 && (
            <p className="text-muted-foreground">
              🚀 Start completing tasks to unlock detailed insights about your productivity patterns!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}