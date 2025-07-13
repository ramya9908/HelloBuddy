// components/common/Header.tsx
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleWithdrawClick = useCallback(() => {
    navigate('/withdraw');
    setIsMenuOpen(false);
  }, [navigate]);

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm py-4 relative">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold text-blue-600">
          SocialEarn
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-500 mr-1" />
            <span className="font-medium">₹{user.earnings.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <User className="h-5 w-5 mr-1" />
            <span>{user.fullName}</span>
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
              Batch {user.batchLetter}
            </span>
          </div>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/withdraw')}
          >
            Withdraw
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleLogout}
            icon={<LogOut className="h-4 w-4" />}
          >
            Logout
          </Button>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-700" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg absolute top-16 left-0 right-0 z-50 border-t">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                <span className="truncate">{user.fullName}</span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                Batch {user.batchLetter}
              </span>
            </div>

            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium">Current Earnings: ₹{user.earnings.toFixed(2)}</span>
            </div>

            <Button 
              variant="primary"
              fullWidth
              onClick={handleWithdrawClick}
            >
              Withdraw Earnings
            </Button>

            <Button 
              variant="secondary"
              fullWidth
              onClick={handleLogout}
              icon={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;