
"use client";

import AddProductDialog from './add-product-dialog';
import ImportInventoryDialog from './import-inventory-dialog';
import type { Product, UserProfile } from '@/lib/types';
import { Button } from './ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { LogOut } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import RoopkothaLogo from './icons/roopkotha-logo';
import { ThemeToggle } from './theme-toggle';

type HeaderProps = {
  addProduct: (product: Omit<Product, 'id'>) => void;
  onImportInventory: (products: Omit<Product, 'id'>[]) => Promise<void>;
  userRole: UserProfile['role'] | null;
};

export default function Header({ addProduct, onImportInventory, userRole }: HeaderProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };


  return (
    <header className="flex-shrink-0 bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <RoopkothaLogo showTagline={false} width={150} height={36} />
          </div>
          <div className="flex items-center gap-4">
             <ThemeToggle />
            {user && (
              <>
                {userRole === 'admin' && (
                  <>
                    <ImportInventoryDialog onImport={onImportInventory} />
                    <AddProductDialog addProduct={addProduct} />
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
