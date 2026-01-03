import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/supabase'; // Corrected import to use main supabase client
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';


const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null); // Added role state
  const [projectId, setProjectId] = useState(null); // Added projectId state

  const getProfileAndProject = useCallback(async (currentUser) => {
    if (!currentUser) {
      setRole(null);
      setProjectId(null);
      return { role: null, projectId: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      setRole('customer'); 
      setProjectId(null);
      return { role: 'customer', projectId: null };
    }
    
    const currentRole = profile?.role || 'customer';
    setRole(currentRole);

    if (currentRole === 'establishment') {
      const { data: member, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', currentUser.id)
        .limit(1)
        .single();
      
      if (memberError) {
        console.error('Error fetching project member:', memberError);
        setProjectId(null);
        return { role: currentRole, projectId: null };
      }
        
      const currentProjectId = member?.project_id || null;
      setProjectId(currentProjectId);
      return { role: currentRole, projectId: currentProjectId };
    }
    
    setProjectId(null);
    return { role: currentRole, projectId: null };
  }, []);

  useEffect(() => {
    const handleAuthStateChange = async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);
      setLoading(true);

      if (currentUser) {
        const { role: newRole } = await getProfileAndProject(currentUser);
        
        const isCallbackPage = location.pathname.startsWith('/auth/callback');
        const isPassPage = location.pathname.startsWith('/c/');

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !isCallbackPage && !isPassPage) {
          if (newRole === 'superadmin') {
            navigate('/admin', { replace: true });
          } else if (newRole === 'establishment') {
            navigate('/org', { replace: true });
          } else if (newRole === 'customer') {
            navigate('/login', { replace: true }); // Redirect customers to login or a default non-admin page
          }
        }
      } else {
        setRole(null);
        setProjectId(null);
        if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true });
        }
      }
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check
    const checkInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching initial session:", error);
      }
      handleAuthStateChange('INITIAL_SESSION', session);
    };
    checkInitialSession();


    return () => authListener?.subscription?.unsubscribe();
  }, [getProfileAndProject, navigate, location.pathname, toast]);


  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    role, // Include role in context value
    projectId, // Include projectId in context value
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, role, projectId, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};