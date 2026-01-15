'use client';

import { Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                'bg-admin-bg-elevated border border-admin-border rounded-xl shadow-admin-lg max-w-lg w-full max-h-[90vh] overflow-hidden',
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {title && (
                <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-admin-text">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-1 text-admin-text-secondary hover:text-admin-text transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <div className="p-6 overflow-y-auto">{children}</div>
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
