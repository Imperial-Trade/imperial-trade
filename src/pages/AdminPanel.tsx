import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { LiveSession } from "@/api/entities";
import { TradeAlert } from "@/api/entities";
import { AccountRequest } from "@/api/entities";
import { AuditLog } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Video,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Info,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import AccessDenied from "../components/AccessDenied";
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from "../components/auth/AuthNotifications";
import { getMarketData } from "@/api/functions";

// Extend the Window interface to include addNotification
declare global {
  interface Window {
    addNotification?: (notification: {
      type: string;
      title: string;
      message: string;
    }) => void;
  }
}

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingAccountRequests, setPendingAccountRequests] = useState([]);
  const [allAccountRequests, setAllAccountRequests] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingAlert, setEditingAlert] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);

  const [sessionForm, setSessionForm] = useState({
    session_title: "",
    host_name: "",
    session_date: "",
    description: "",
    zoom_meeting_url: "",
    zoom_passcode: "",
    status: "scheduled",
  });

  const [alertForm, setAlertForm] = useState({
    asset_name: "",
    finnhub_symbol: "",
    trade_type: "buy",
    entry_price: "",
    stop_loss: "",
    take_profits: [""],
    notes: "",
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (alertForm.finnhub_symbol) {
      fetchCurrentPrice(alertForm.finnhub_symbol);
    } else {
      setCurrentPrice(null);
    }
  }, [alertForm.finnhub_symbol]);

  const checkAdminAccess = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser && currentUser.access_level === "admin") {
        setUser(currentUser);
        loadData();
      } else {
        setUser({ access_denied: true });
      }
    } catch (error) {
      console.error("Access check failed:", error);
      setUser({ access_denied: true });
    }
    setIsLoading(false);
  };

  const loadData = async () => {
    try {
      const [
        fetchedSessions,
        fetchedAlerts,
        fetchedPendingRequests,
        fetchAllRequests,
        fetchedPendingVerifications,
        fetchedAuditLogs,
      ] = await Promise.all([
        LiveSession.list("-session_date"),
        TradeAlert.list("-created_date"),
        AccountRequest.filter({ status: "pending" }, "-created_date"),
        AccountRequest.list("-created_date"),
        User.filter({ verification_status: "pending" }, "-created_date"),
        AuditLog.list("-created_date", 100),
      ]);
      setSessions(fetchedSessions);
      setAlerts(fetchedAlerts);
      setPendingAccountRequests(fetchedPendingRequests);
      setAllAccountRequests(fetchAllRequests);
      setPendingVerifications(fetchedPendingVerifications);
      setAuditLogs(fetchedAuditLogs);
    } catch (error) {
      console.error("Error loading data:", error);
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Data Load Failed",
          message: "Could not load all admin data. Please try refreshing.",
        });
      }
    }
  };

  const fetchCurrentPrice = async (symbol) => {
    try {
      const response = await getMarketData({ symbols: [symbol] });
      if (response?.data?.prices && response.data.prices[symbol]) {
        setCurrentPrice(response.data.prices[symbol]);
      } else {
        setCurrentPrice("N/A (No price data)");
      }
    } catch (error) {
      console.error("Error fetching current price for", symbol, ":", error);
      setCurrentPrice("Error fetching price");
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSession) {
        await LiveSession.update(editingSession.id, sessionForm);
      } else {
        await LiveSession.create(sessionForm);
      }
      setShowSessionForm(false);
      setEditingSession(null);
      setSessionForm({
        session_title: "",
        host_name: "",
        session_date: "",
        description: "",
        zoom_meeting_url: "",
        zoom_passcode: "",
        status: "scheduled",
      });
      loadData();
      if (window.addNotification) {
        window.addNotification({
          type: "success",
          title: "Success",
          message: `Session ${
            editingSession ? "updated" : "scheduled"
          } successfully.`,
        });
      }
    } catch (error) {
      console.error("Error saving session:", error);
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Session Save Failed",
          message: error.message,
        });
      }
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      session_title: session.session_title,
      host_name: session.host_name,
      session_date: session.session_date,
      description: session.description,
      zoom_meeting_url: session.zoom_meeting_url,
      zoom_passcode: session.zoom_passcode || "",
      status: session.status,
    });
    setShowSessionForm(true);
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      try {
        await LiveSession.delete(sessionId);
        loadData();
        if (window.addNotification) {
          window.addNotification({
            type: "success",
            title: "Success",
            message: "Session deleted successfully.",
          });
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        if (window.addNotification) {
          window.addNotification({
            type: "error",
            title: "Session Delete Failed",
            message: error.message,
          });
        }
      }
    }
  };

  const handleAlertSubmit = async (e) => {
    e.preventDefault();
    try {
      const isNewAlert = !editingAlert;
      const alertData = {
        asset_name: alertForm.asset_name,
        finnhub_symbol: alertForm.finnhub_symbol,
        trade_type: alertForm.trade_type,
        entry_price: parseFloat(alertForm.entry_price),
        stop_loss: parseFloat(alertForm.stop_loss),
        notes: alertForm.notes,
        status: alertForm.trade_type.includes("limit") ? "pending" : "active",
      };

      alertForm.take_profits.forEach((tp, index) => {
        const tpKey = `tp${index + 1}`;
        if (tp && !isNaN(parseFloat(tp))) {
          alertData[tpKey] = parseFloat(tp);
        } else {
          alertData[tpKey] = null;
        }
      });

      if (editingAlert) {
        await TradeAlert.update(editingAlert.id, alertData);
      } else {
        await TradeAlert.create(alertData);
      }

      setShowAlertForm(false);
      setEditingAlert(null);
      setAlertForm({
        asset_name: "",
        finnhub_symbol: "",
        trade_type: "buy",
        entry_price: "",
        stop_loss: "",
        take_profits: [""],
        notes: "",
      });
      setCurrentPrice(null);
      loadData();

      if (isNewAlert) {
        window.dispatchEvent(new CustomEvent("signal-posted"));

        if (window.addNotification) {
          window.addNotification({
            type: "new_signal",
            title: `📊 New Signal Posted!`,
            message: `${alertData.asset_name} ${alertData.trade_type
              .toUpperCase()
              .replace("_", " ")}`,
          });
        }
      }

      if (window.addNotification) {
        window.addNotification({
          type: "trade_closed",
          title: "Success",
          message: `Signal ${isNewAlert ? "posted" : "updated"} successfully.`,
        });
      }
    } catch (error) {
      console.error("Error saving alert:", error);
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Alert Save Failed",
          message: error.message,
        });
      }
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    const takeProfits = [alert.tp1, alert.tp2, alert.tp3, alert.tp4, alert.tp5]
      .filter((tp) => tp != null)
      .map((tp) => tp.toString());

    let formFinnhubSymbol = alert.finnhub_symbol;
    if (formFinnhubSymbol === "XAUUSD") {
      formFinnhubSymbol = "XAU/USD";
    } else if (formFinnhubSymbol === "BTCUSD") {
      formFinnhubSymbol = "BTC/USD";
    }

    setAlertForm({
      asset_name: alert.asset_name,
      finnhub_symbol: formFinnhubSymbol || "",
      trade_type: alert.trade_type,
      entry_price: alert.entry_price.toString(),
      stop_loss: alert.stop_loss.toString(),
      take_profits: takeProfits.length > 0 ? takeProfits : [""],
      notes: alert.notes || "",
    });
    setShowAlertForm(true);
  };

  const handleDeleteAlert = async (alertId) => {
    if (window.confirm("Are you sure you want to delete this trade alert?")) {
      try {
        await TradeAlert.delete(alertId);
        loadData();
        if (window.addNotification) {
          window.addNotification({
            type: "success",
            title: "Success",
            message: "Alert deleted successfully.",
          });
        }
      } catch (error) {
        console.error("Error deleting alert:", error);
        if (window.addNotification) {
          window.addNotification({
            type: "error",
            title: "Alert Delete Failed",
            message: error.message,
          });
        }
      }
    }
  };

  const addTakeProfitLevel = () => {
    if (alertForm.take_profits.length < 5) {
      setAlertForm((prev) => ({
        ...prev,
        take_profits: [...prev.take_profits, ""],
      }));
    }
  };

  const removeTakeProfitLevel = (index) => {
    setAlertForm((prev) => ({
      ...prev,
      take_profits: prev.take_profits.filter((_, i) => i !== index),
    }));
  };

  const updateTakeProfitLevel = (index, value) => {
    setAlertForm((prev) => ({
      ...prev,
      take_profits: prev.take_profits.map((tp, i) =>
        i === index ? value : tp
      ),
    }));
  };

  const handleApproveRequest = async (request) => {
    if (
      !window.confirm(
        `Are you sure you want to approve the account for ${request.full_name}? They will be notified by email.`
      )
    )
      return;

    try {
      await AccountRequest.update(request.id, {
        status: "approved",
        approved_by: user.email,
      });

      await AuditLog.create({
        admin_email: user.email,
        action: "Approved Account Request",
        target_entity: "AccountRequest",
        target_id: request.id,
        details: {
          requested_by: request.email,
          account_type: request.account_type,
        },
      });

      await sendApprovalEmail(request);

      alert(
        `Account request for ${request.full_name} has been approved. They have been notified via email to expect a formal invitation from the platform.`
      );
      loadData();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Failed to approve request. Please check the console for errors.");
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Approval Failed",
          message: error.message,
        });
      }
    }
  };

  const handleRejectRequest = async (request) => {
    const reason = prompt(
      "Please provide a reason for rejection (this will be sent to the user):"
    );
    if (!reason) return;

    try {
      await AccountRequest.update(request.id, {
        status: "rejected",
        approved_by: user.email,
        rejection_reason: reason,
      });

      await AuditLog.create({
        admin_email: user.email,
        action: "Rejected Account Request",
        target_entity: "AccountRequest",
        target_id: request.id,
        details: {
          requested_by: request.email,
          account_type: request.account_type,
          reason: reason,
        },
      });

      await sendRejectionEmail({ ...request, rejection_reason: reason });

      alert(`Account request for ${request.full_name} has been rejected.`);
      loadData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request. Please check the console for errors.");
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Rejection Failed",
          message: error.message,
        });
      }
    }
  };

  const handleApproveVerification = async (targetUser) => {
    if (
      !window.confirm(
        `Are you sure you want to approve the verification for ${targetUser.full_name}? This will set their access level to 'verified'.`
      )
    )
      return;

    try {
      await User.update(targetUser.id, {
        verification_status: "verified",
        access_level: "verified",
      });

      await AuditLog.create({
        admin_email: user.email,
        action: "Approved User Verification",
        target_entity: "User",
        target_id: targetUser.id,
        details: {
          email: targetUser.email,
          old_access_level: targetUser.access_level,
          new_access_level: "verified",
        },
      });

      alert(
        `Verification for ${targetUser.full_name} has been approved. Their access level is now 'verified'.`
      );
      loadData();
    } catch (error) {
      console.error("Error approving verification:", error);
      alert(
        "Failed to approve verification. Please check the console for errors."
      );
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Verification Approval Failed",
          message: error.message,
        });
      }
    }
  };

  const handleRejectVerification = async (targetUser) => {
    const reason = prompt(
      "Please provide a reason for rejection (this will update their verification status):"
    );
    if (!reason) return;

    try {
      await User.update(targetUser.id, {
        verification_status: "rejected",
        verification_rejection_reason: reason,
      });

      await AuditLog.create({
        admin_email: user.email,
        action: "Rejected User Verification",
        target_entity: "User",
        target_id: targetUser.id,
        details: { email: targetUser.email, reason: reason },
      });

      alert(`Verification for ${targetUser.full_name} has been rejected.`);
      loadData();
    } catch (error) {
      console.error("Error rejecting verification:", error);
      alert(
        "Failed to reject verification. Please check the console for errors."
      );
      if (window.addNotification) {
        window.addNotification({
          type: "error",
          title: "Verification Rejection Failed",
          message: error.message,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  if (!user || user.access_denied) {
    return <AccessDenied requiredLevel="admin" />;
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-accent-gold" />
            <h1 className="text-3xl lg:text-4xl font-bold text-primary">
              Educator <span className="gold-text-gradient">Control Panel</span>
            </h1>
          </div>
          <p className="text-secondary text-lg">
            Manage live sessions and trade alerts for the Imperial Trading
            Community
          </p>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6 bg-surface/50">
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trade Alerts
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-accent-green data-[state=active]:text-white"
            >
              <Video className="w-4 h-4 mr-2" />
              Live Sessions
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="data-[state=active]:bg-accent-blue data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Account Requests
            </TabsTrigger>
            <TabsTrigger
              value="verification"
              className="data-[state=active]:bg-accent-purple data-[state=active]:text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verification
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="data-[state=active]:bg-accent-gold data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-primary">
                  Live Sessions Management
                </h2>
                <Button
                  onClick={() => setShowSessionForm(true)}
                  className="bg-accent-green hover:bg-green-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule New Session
                </Button>
              </div>

              <div className="grid gap-4">
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <Card
                      key={session.id}
                      className="glass-effect border-default"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-primary">
                                {session.session_title}
                              </h3>
                              <Badge
                                className={
                                  session.status === "live"
                                    ? "bg-red-500/20 text-accent-red"
                                    : session.status === "completed"
                                    ? "bg-gray-500/20 text-gray-400"
                                    : "bg-blue-500/20 text-accent-blue"
                                }
                              >
                                {session.status}
                              </Badge>
                            </div>
                            <p className="text-secondary mb-2">
                              {session.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-secondary">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(
                                  new Date(session.session_date),
                                  "MMM d, yyyy h:mm a"
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                Host: {session.host_name}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSession(session)}
                              className="border-default text-secondary hover:bg-surface"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSession(session.id)}
                              className="border-red-500/20 text-accent-red hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Live Sessions Scheduled
                    </h3>
                    <p className="text-secondary">
                      Schedule new live sessions for the community here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-primary">
                  Trade Signals Management
                </h2>
                <Button
                  onClick={() => setShowAlertForm(true)}
                  className="bg-accent-green hover:bg-green-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post New Signal
                </Button>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-4 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Signal Broadcasting</h4>
                  <p className="text-sm">
                    Signals created here will be immediately visible to all
                    community members on the Live Signal Stream. Use
                    responsibly.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      className="glass-effect border-default"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-primary">
                                {alert.asset_name}
                              </h3>
                              <Badge
                                className={
                                  alert.trade_type.includes("buy")
                                    ? "bg-green-500/20 text-accent-green"
                                    : "bg-red-500/20 text-accent-red"
                                }
                              >
                                {alert.trade_type
                                  .toUpperCase()
                                  .replace("_", " ")}
                              </Badge>
                              <Badge
                                className={
                                  alert.status === "active"
                                    ? "bg-blue-500/20 text-accent-blue"
                                    : "bg-gray-500/20 text-gray-400"
                                }
                              >
                                {alert.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-secondary">Entry:</span>
                                <span className="font-semibold text-primary ml-2">
                                  {alert.entry_price}
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary">
                                  Stop Loss:
                                </span>
                                <span className="font-semibold text-accent-red ml-2">
                                  {alert.stop_loss}
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary">
                                  Take Profits:
                                </span>
                                <span className="font-semibold text-accent-green ml-2">
                                  {[
                                    alert.tp1,
                                    alert.tp2,
                                    alert.tp3,
                                    alert.tp4,
                                    alert.tp5,
                                  ]
                                    .filter((tp) => tp != null)
                                    .join(", ")}
                                </span>
                              </div>
                              <div>
                                <span className="text-secondary">Created:</span>
                                <span className="font-semibold text-primary ml-2">
                                  {format(
                                    new Date(alert.created_date),
                                    "MMM d"
                                  )}
                                </span>
                              </div>
                            </div>
                            {alert.notes && (
                              <div className="mt-2 text-sm text-secondary">
                                <span className="font-semibold">Notes:</span>{" "}
                                {alert.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAlert(alert)}
                              className="border-default text-secondary hover:bg-surface"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="border-red-500/20 text-accent-red hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Trade Alerts Created
                    </h3>
                    <p className="text-secondary">
                      Create new trade alerts for the community here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-primary">
                  Pending Account Requests
                </h2>
                <Badge className="bg-blue-500/20 text-accent-blue">
                  {pendingAccountRequests.length} Pending
                </Badge>
              </div>

              <div className="bg-blue-900/30 border border-blue-700 text-blue-200 p-4 rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Admin Action Required</h4>
                  <p className="text-sm">
                    Approving a request here notifies the user and tracks it in
                    our system. You must still{" "}
                    <strong>manually invite the approved user</strong> via the
                    Base44 Workspace user management section to grant them final
                    access.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {pendingAccountRequests.length > 0 ? (
                  pendingAccountRequests.map((request) => (
                    <Card
                      key={request.id}
                      className="glass-effect border-default"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-xl font-semibold text-primary">
                                {request.full_name}
                              </h3>
                              <Badge
                                className={
                                  request.account_type === "admin"
                                    ? "bg-accent-gold/20 text-accent-gold"
                                    : "bg-green-500/20 text-accent-green"
                                }
                              >
                                {request.account_type === "admin"
                                  ? "EDUCATOR"
                                  : "USER"}
                              </Badge>
                              <Badge className="bg-blue-500/20 text-accent-blue">
                                PENDING
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-secondary">Email:</span>{" "}
                                <span className="text-primary">
                                  {request.email}
                                </span>
                              </p>
                              {request.username && (
                                <p>
                                  <span className="text-secondary">
                                    Username:
                                  </span>{" "}
                                  <span className="text-primary">
                                    {request.username}
                                  </span>
                                </p>
                              )}
                              <p>
                                <span className="text-secondary">
                                  Requested:
                                </span>{" "}
                                <span className="text-primary">
                                  {format(
                                    new Date(request.created_date),
                                    "MMM d, yyyy h:mm a"
                                  )}
                                </span>
                              </p>
                              {request.reason && (
                                <div className="mt-2">
                                  <p className="text-secondary text-xs">
                                    Reason:
                                  </p>
                                  <p className="text-primary text-sm bg-surface/50 p-2 rounded mt-1">
                                    {request.reason}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                              className="border-green-500/20 text-accent-green hover:bg-green-500/10"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectRequest(request)}
                              className="border-red-500/20 text-accent-red hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Pending Account Requests
                    </h3>
                    <p className="text-secondary">
                      All new account requests will appear here for your review.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-primary">
                  Pending Verification Requests
                </h2>
                <Badge className="bg-blue-500/20 text-accent-blue">
                  {pendingVerifications.length} Pending
                </Badge>
              </div>

              <div className="grid gap-4">
                {pendingVerifications.length > 0 ? (
                  pendingVerifications.map((user) => (
                    <Card key={user.id} className="glass-effect border-default">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-primary">
                                {user.full_name}
                              </h3>
                              <Badge className="bg-blue-500/20 text-accent-blue">
                                Verification Pending
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-secondary">Email:</span>{" "}
                                <span className="text-primary">
                                  {user.email}
                                </span>
                              </p>
                              {user.verification_submitted_date && (
                                <p>
                                  <span className="text-secondary">
                                    Submitted:
                                  </span>{" "}
                                  <span className="text-primary">
                                    {format(
                                      new Date(
                                        user.verification_submitted_date
                                      ),
                                      "MMM d, yyyy h:mm a"
                                    )}
                                  </span>
                                </p>
                              )}
                              {user.verification_document_url && (
                                <p>
                                  <span className="text-secondary">
                                    Document:
                                  </span>
                                  <a
                                    href={user.verification_document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline ml-1"
                                  >
                                    View Document
                                  </a>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveVerification(user)}
                              className="border-green-500/20 text-accent-green hover:bg-green-500/10"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectVerification(user)}
                              className="border-red-500/20 text-accent-red hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Pending Verifications
                    </h3>
                    <p className="text-secondary">
                      User verification requests will appear here for review.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Admin Action Log
            </h2>
            <Card className="glass-effect border-default">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-secondary uppercase bg-surface/50">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Timestamp
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Admin
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Action
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-default last:border-b-0"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-primary">
                              {format(
                                new Date(log.created_date),
                                "MMM d, yyyy h:mm a"
                              )}
                            </td>
                            <td className="px-6 py-4 text-primary">
                              {log.admin_email}
                            </td>
                            <td className="px-6 py-4 text-primary">
                              {log.action}
                            </td>
                            <td className="px-6 py-4 text-secondary text-xs break-words">
                              {log.target_entity && (
                                <p>
                                  <strong>Target Entity:</strong>{" "}
                                  {log.target_entity}
                                </p>
                              )}
                              {log.target_id && (
                                <p>
                                  <strong>Target ID:</strong> {log.target_id}
                                </p>
                              )}
                              {log.details && (
                                <pre className="mt-1 p-2 bg-surface/50 rounded overflow-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-default">
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-secondary"
                          >
                            No audit logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showSessionForm && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <Card className="glass-effect border-default w-full max-w-2xl max-h-[90vh] overflow-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-primary">
                    {editingSession
                      ? "Edit Live Session"
                      : "Schedule New Live Session"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowSessionForm(false);
                      setEditingSession(null);
                      setSessionForm({
                        session_title: "",
                        host_name: "",
                        session_date: "",
                        description: "",
                        zoom_meeting_url: "",
                        zoom_passcode: "",
                        status: "scheduled",
                      });
                    }}
                    className="text-primary hover:bg-surface"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSessionSubmit} className="space-y-4">
                  <Input
                    placeholder="Session Title"
                    value={sessionForm.session_title}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        session_title: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                    required
                  />
                  <Input
                    placeholder="Host Name"
                    value={sessionForm.host_name}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        host_name: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                    required
                  />
                  <Input
                    type="datetime-local"
                    value={sessionForm.session_date}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        session_date: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                    required
                  />
                  <Textarea
                    placeholder="Session Description"
                    value={sessionForm.description}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                    rows={3}
                  />
                  <Input
                    placeholder="Zoom Meeting URL"
                    value={sessionForm.zoom_meeting_url}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        zoom_meeting_url: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                    required
                  />
                  <Input
                    placeholder="Zoom Passcode (optional)"
                    value={sessionForm.zoom_passcode}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        zoom_passcode: e.target.value,
                      }))
                    }
                    className="bg-surface border-default text-primary"
                  />
                  <Select
                    value={sessionForm.status}
                    onValueChange={(value) =>
                      setSessionForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-surface border-default text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSessionForm(false);
                        setEditingSession(null);
                        setSessionForm({
                          session_title: "",
                          host_name: "",
                          session_date: "",
                          description: "",
                          zoom_meeting_url: "",
                          zoom_passcode: "",
                          status: "scheduled",
                        });
                      }}
                      className="border-default text-secondary hover:bg-surface"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-accent-green hover:bg-green-500 text-white"
                    >
                      {editingSession ? "Update Session" : "Schedule Session"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {showAlertForm && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <Card className="glass-effect border-default w-full max-w-2xl max-h-[90vh] overflow-auto">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-primary">
                    {editingAlert
                      ? "Edit Trade Signal"
                      : "Post New Trade Signal"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAlertForm(false);
                      setEditingAlert(null);
                      setAlertForm({
                        asset_name: "",
                        finnhub_symbol: "",
                        trade_type: "buy",
                        entry_price: "",
                        stop_loss: "",
                        take_profits: [""],
                        notes: "",
                      });
                      setCurrentPrice(null);
                    }}
                    className="text-primary hover:bg-surface"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAlertSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-primary mb-2 block">
                        Asset Selection
                      </label>
                      <Select
                        value={alertForm.finnhub_symbol}
                        onValueChange={(value) => {
                          let asset = "";
                          switch (value) {
                            case "XAU/USD":
                              asset = "Gold";
                              break;
                            case "BTC/USD":
                              asset = "Bitcoin";
                              break;
                            default:
                              asset = value;
                          }
                          setAlertForm((prev) => ({
                            ...prev,
                            finnhub_symbol: value,
                            asset_name: asset,
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-surface border-default text-primary">
                          <SelectValue placeholder="Select asset with live price feed..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="XAU/USD">
                            <div className="flex justify-between items-center w-full">
                              <span>Gold</span>
                              <Badge variant="outline" className="ml-2">
                                XAU/USD
                              </Badge>
                            </div>
                          </SelectItem>
                          <SelectItem value="BTC/USD">
                            <div className="flex justify-between items-center w-full">
                              <span>Bitcoin</span>
                              <Badge variant="outline" className="ml-2">
                                BTC/USD
                              </Badge>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {currentPrice !== null && currentPrice !== undefined && (
                        <p className="text-sm text-secondary mt-2">
                          Live Price for{" "}
                          {alertForm.asset_name || alertForm.finnhub_symbol}:{" "}
                          <span className="font-semibold text-primary">
                            {currentPrice}
                          </span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-primary mb-2 block">
                        Trade Type
                      </label>
                      <Select
                        value={alertForm.trade_type}
                        onValueChange={(value) =>
                          setAlertForm((prev) => ({
                            ...prev,
                            trade_type: value,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-surface border-default text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Buy (Market)</SelectItem>
                          <SelectItem value="sell">Sell (Market)</SelectItem>
                          <SelectItem value="buy_limit">
                            Buy Limit Order
                          </SelectItem>
                          <SelectItem value="sell_limit">
                            Sell Limit Order
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-primary mb-2 block">
                        Entry Price
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Entry price"
                        value={alertForm.entry_price}
                        onChange={(e) =>
                          setAlertForm((prev) => ({
                            ...prev,
                            entry_price: e.target.value,
                          }))
                        }
                        className="bg-surface border-default text-primary"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-medium text-primary mb-2 block">
                        Stop Loss
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Stop loss price"
                        value={alertForm.stop_loss}
                        onChange={(e) =>
                          setAlertForm((prev) => ({
                            ...prev,
                            stop_loss: e.target.value,
                          }))
                        }
                        className="bg-surface border-default text-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-primary">
                        Take Profit Levels (up to 5)
                      </label>
                      {alertForm.take_profits.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTakeProfitLevel}
                          className="border-accent-green text-accent-green hover:bg-accent-green/10"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add TP
                        </Button>
                      )}
                    </div>
                    {alertForm.take_profits.map((tp, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <label className="text-sm text-secondary w-12">
                          TP{index + 1}:
                        </label>
                        <Input
                          type="number"
                          step="any"
                          placeholder={`Take Profit ${index + 1}`}
                          value={tp}
                          onChange={(e) =>
                            updateTakeProfitLevel(index, e.target.value)
                          }
                          className="bg-surface border-default text-primary flex-1"
                          required={index === 0}
                        />
                        {alertForm.take_profits.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTakeProfitLevel(index)}
                            className="text-accent-red hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-primary mb-2 block">
                      Notes / Commentary
                    </label>
                    <Textarea
                      placeholder="Add market analysis, reasoning, or additional context..."
                      value={alertForm.notes}
                      onChange={(e) =>
                        setAlertForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="bg-surface border-default text-primary"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAlertForm(false);
                        setEditingAlert(null);
                        setAlertForm({
                          asset_name: "",
                          finnhub_symbol: "",
                          trade_type: "buy",
                          entry_price: "",
                          stop_loss: "",
                          take_profits: [""],
                          notes: "",
                        });
                        setCurrentPrice(null);
                      }}
                      className="border-default text-secondary hover:bg-surface"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-accent-green hover:bg-green-500 text-white"
                    >
                      {editingAlert ? "Update Signal" : "Post Signal"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
