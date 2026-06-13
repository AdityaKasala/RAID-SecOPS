import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import type { AlertRow } from '../../lib/api'
import { fmtTs } from '../../lib/utils'
import {
  StatusBadge,
  ConfBadge,
  DeferBadge,
  InvStatusBadge,
  RoleBadge,
} from '../shared/StatusBadge'
import { Button } from '../shared/Button'

interface Props {
  data: AlertRow[]
}

export function AlertsTable({ data }: Props) {
  const navigate = useNavigate()
  const { setSelectedAlert } = useApp()

  const openAlert = (alert: AlertRow) => {
    setSelectedAlert(alert as never)
    navigate(`/alerts/${alert.sampleId}`)
  }

  const columns = useMemo<ColumnDef<AlertRow>[]>(
    () => [
      {
        accessorKey: 'sampleId',
        header: 'Sample ID',
        cell: (i) => (
          <span className="font-mono text-[11px] text-gray-500">
            {i.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: (i) => (
          <span className="text-[11px] text-gray-400 whitespace-nowrap">
            {fmtTs(i.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'sourceSiem',
        header: 'Source SIEM',
        cell: (i) => (
          <span className="text-[12px] text-gray-700">{i.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (i) => <StatusBadge status={i.getValue<'ATTACK' | 'NORMAL'>()} />,
      },
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        cell: (i) => <ConfBadge value={i.getValue<number>()} />,
      },
      {
        accessorKey: 'attackType',
        header: 'Attack Type',
        cell: (i) => (
          <span className="text-[11px] text-gray-500">{i.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'mitreTechnique',
        header: 'MITRE Technique',
        cell: (i) => (
          <span
            className="text-[11px] text-gray-400 truncate max-w-[140px] block"
            title={i.getValue<string>()}
          >
            {i.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'deferToHuman',
        header: 'Defer to Human',
        cell: (i) => <DeferBadge value={i.getValue<boolean>()} />,
      },
      {
        accessorKey: 'assignedRole',
        header: 'Assigned Role',
        cell: (i) => (
          <RoleBadge role={i.getValue<'analyst' | 'engineer' | 'grc'>()} />
        ),
      },
      {
        accessorKey: 'investigationStatus',
        header: 'Inv. Status',
        cell: (i) => (
          <InvStatusBadge
            status={i.getValue<
              'new' | 'under_investigation' | 'escalated' | 'closed'
            >()}
          />
        ),
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openAlert(row.original)
            }}
          >
            Open Alert
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {table.getFlatHeaders().map((header) => (
                <th
                  key={header.id}
                  className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-[12px] text-gray-400"
                >
                  No alerts match the current filters.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openAlert(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3.5 py-2.5 text-[12px] text-gray-700"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
