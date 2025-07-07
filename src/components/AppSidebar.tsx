
import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Home,
  Book,
  Video,
  Users,
  Wrench,
  User,
  Info,
  Settings,
  Crown,
  TrendingUp,
  BarChart3,
  Bell,
  MessageCircle,
  Calendar,
  Target,
  Award,
  Shield
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Education", url: "/education", icon: Book },
  { title: "Signal Stream", url: "/signals", icon: TrendingUp },
  { title: "Live Sessions", url: "/live", icon: Video },
  { title: "Community Forum", url: "/community", icon: Users },
  { title: "IB Partnership", url: "/partnership", icon: Crown },
]

const toolsItems = [
  { title: "Advanced Tools", url: "/tools", icon: Wrench },
  { title: "Market Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Trading Calendar", url: "/calendar", icon: Calendar },
  { title: "Performance", url: "/performance", icon: Target },
]

const accountItems = [
  { title: "My Progress", url: "/progress", icon: Award },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "About", url: "/about", icon: Info },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"

  const isActive = (path: string) => currentPath === path

  const getNavClassName = (path: string) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
      isActive(path)
        ? "bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/20"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
    }`

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-border/50 bg-sidebar-background/95 backdrop-blur-xl`}>
      <SidebarContent className="p-4">
        {/* User Profile Section */}
        {!collapsed && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-amber-300/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-amber-300 flex items-center justify-center">
                <User className="h-5 w-5 text-background" />
              </div>
              <div>
                <p className="font-semibold text-sm">Trading Member</p>
                <p className="text-xs text-muted-foreground">Premium Access</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold mb-3">
            {!collapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={`h-5 w-5 ${isActive(item.url) ? 'text-primary' : ''}`} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Trading Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold mb-3 mt-6">
            {!collapsed && "Trading Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={`h-5 w-5 ${isActive(item.url) ? 'text-primary' : ''}`} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold mb-3 mt-6">
            {!collapsed && "Account"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={`h-5 w-5 ${isActive(item.url) ? 'text-primary' : ''}`} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Premium Badge */}
        {!collapsed && (
          <div className="mt-8 p-3 rounded-lg bg-gradient-to-r from-primary/20 to-amber-300/20 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Premium Member</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Full access to all trading tools and signals
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
