"use client"
import Link from "next/link"
import { useAuth } from "@/providers/AuthProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Settings, ChevronDown } from "lucide-react"

export function UserMenu() {
  const { user, logout } = useAuth()

  // Get initials from name or first letter of email
  const getInitials = () => {
    if (user?.name) {
      const nameParts = user.name.split(" ")
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      }
      return user.name.charAt(0).toUpperCase()
    }
    return user?.email ? user.email.charAt(0).toUpperCase() : "U"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-3 pr-2 py-1 transition-colors hover:bg-slate-100 outline-none">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">{user?.name || user?.email || "Usuário"}</span>
            <span className="text-xs text-slate-500">{user?.departamento || "Atendente"}</span>
          </div>

          <Avatar className="h-9 w-9 border border-slate-200">
            {user?.picture ? (
              <AvatarImage src={user.picture || "/placeholder.svg"} alt={user?.name || "Avatar do usuário"} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                {getInitials()}
              </AvatarFallback>
            )}
          </Avatar>

          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name || "Usuário"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <Link href="/auth" passHref>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </DropdownMenuItem>
        </Link>

        <Link href="/configuracoes" passHref>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
