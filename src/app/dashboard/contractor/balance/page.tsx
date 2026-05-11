"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";

export default function ContractorBalancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["contractor-balance"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: txData } = useQuery({
    queryKey: ["balance-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance/transactions");
      if (!res.ok) return { transactions: [] };
      return res.json();
    },
  });

  const balance = balanceData?.balance;
  const transactions = txData?.transactions || [];

  const typeColors: Record<string, string> = {
    CREDIT: "text-emerald-400 bg-emerald-500/10",
    DEBIT: "text-red-400 bg-red-500/10",
    WITHDRAWAL: "text-amber-400 bg-amber-500/10",
    ADJUSTMENT: "text-blue-400 bg-blue-500/10",
  };

  const typeIcons: Record<string, any> = {
    CREDIT: TrendingUp,
    DEBIT: TrendingDown,
    WITHDRAWAL: ArrowDownToLine,
    ADJUSTMENT: RefreshCw,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Balance</h1>
          <p className="text-text-secondary mt-1">Manage your earnings and withdrawals</p>
        </div>
        <Link href="/dashboard/withdrawals">
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Available Balance</p>
                <p className="text-xl font-bold text-emerald-400">
                  {isLoading ? "..." : formatCurrency(balance?.availableBalance || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Pending</p>
                <p className="text-xl font-bold text-amber-400">
                  {isLoading ? "..." : formatCurrency(balance?.pendingAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Earned</p>
                <p className="text-xl font-bold text-cyan-400">
                  {isLoading ? "..." : formatCurrency(balance?.totalEarned || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Withdrawn</p>
                <p className="text-xl font-bold text-purple-400">
                  {isLoading ? "..." : formatCurrency(balance?.totalWithdrawn || 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transaction History</CardTitle>
        </CardHeader>
        {transactions.length > 0 ? (
          <div className="space-y-1">
            {transactions.map((tx: any) => {
              const Icon = typeIcons[tx.type] || DollarSign;
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      typeColors[tx.type] || "text-text-secondary bg-surface-hover"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatRelativeTime(tx.createdAt)}
                      {tx.referenceId && (
                        <span className="ml-2 text-text-dim">• {tx.referenceId.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isPositive ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-text-dim">
                      Balance: {formatCurrency(tx.balanceAfter)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <DollarSign className="h-10 w-10 mb-3 text-text-dim" />
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs text-text-dim mt-1">
              Transactions will appear when invoices are paid
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
