import Link from 'next/link';
import {ArrowRight,ArrowLeft,Info} from 'lucide-react';
import {Logo} from '@/components/workspace-app';
export default function Login(){return <main className="login-page"><section className="login-card"><Link className="brand" href="/"><Logo/><span>constrack.</span></Link><h1>A little room for great work.</h1><p>Your workspace is taking shape.</p><div className="integration-note"><Info size={20}/><p>Account sign-in is not connected yet. Explore the demo to create boards and manage tasks. Demo changes are saved in this browser.</p></div><Link className="button primary full" href="/app/dashboard">Enter the demo workspace <ArrowRight size={17}/></Link><Link className="back-link" href="/"><ArrowLeft size={14}/>Back to home</Link></section></main>}
