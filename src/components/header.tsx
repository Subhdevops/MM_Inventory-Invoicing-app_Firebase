
"use client";

import AddProductDialog from './add-product-dialog';
import ImportInventoryDialog from './import-inventory-dialog';
import type { Product, UserProfile } from '@/lib/types';
import { Button } from './ui/button';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import RoopkothaLogo from './icons/roopkotha-logo';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { doc, updateDoc } from 'firebase/firestore';

type HeaderProps = {
  addProduct: (product: Omit<Product, 'id'>) => void;
  onImportInventory: (products: Omit<Product, 'id'>[]) => Promise<void>;
  userRole: UserProfile['role'] | null;
};

export default function Header({ addProduct, onImportInventory, userRole }: HeaderProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const handleLogout = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      // Signal global logout first
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
          lastSignOutTimestamp: new Date().getTime()
      });

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? 'User Avatar'} />
                        <AvatarFallback>
                          {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.displayName || 'My Account'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Role: <span className="font-semibold capitalize text-foreground">{userRole}</span>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
