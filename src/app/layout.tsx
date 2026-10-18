import type { Metadata } from 'next';
import { WorkspaceProvider } from '@/store/workspace';
import { Suspense } from 'react';
import { NavigationProgress } from '@/components/navigation-progress';
import './globals.css';
export const metadata:Metadata={title:'Constrack — A little clarity. A lot of progress.',description:'Your ideas, your team, and your next big thing. All in one thoughtful Kanban workspace.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Suspense fallback={null}><NavigationProgress/></Suspense><WorkspaceProvider>{children}</WorkspaceProvider></body></html>}
