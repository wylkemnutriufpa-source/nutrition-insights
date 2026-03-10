/**
 * RANKING DE PROFISSIONAIS (ADMIN ONLY)
 * 
 * Exibe top 10 profissionais por features ativadas.
 * Acessível apenas pelo admin dashboard.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Award, Users } from 'lucide-react';
import { getProfessionalRanking } from '@/utils/featureTracking';
import { getCurrentLevel } from '@/utils/professionalLevels';
import { TOTAL_FEATURES } from '@/constants/platformFeatureInventory';

const ProfessionalRankingBoard = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfessionalRanking();
        setRanking(data.slice(0, 10));
      } catch {
        // silencioso
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="h-5 w-5 text-amber-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-orange-400" />;
    return <span className="text-sm font-bold text-gray-400 w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index) => {
    if (index === 0) return 'bg-amber-50 border-amber-200';
    if (index === 1) return 'bg-gray-50 border-gray-200';
    if (index === 2) return 'bg-orange-50 border-orange-200';
    return 'bg-white border-gray-100';
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-gray-100 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white pb-4">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Ranking de Profissionais
          <Badge className="bg-white/20 text-white border-0 text-[10px]">
            Top {ranking.length}
          </Badge>
        </CardTitle>
        <p className="text-amber-100 text-xs">Baseado em funcionalidades ativadas da plataforma</p>
      </CardHeader>
      <CardContent className="p-4">
        {ranking.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nenhum profissional registrado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((prof, i) => {
              const level = getCurrentLevel(prof.percentage);
              return (
                <div
                  key={prof.professionalId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankBg(i)}`}
                >
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(i)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {prof.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{prof.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`bg-gradient-to-r ${level.badgeColor} text-white border-0 text-[9px]`}>
                      {level.emoji} {level.name}
                    </Badge>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{prof.featuresUsed}/{TOTAL_FEATURES}</p>
                      <p className="text-[10px] text-gray-500">{prof.percentage}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalRankingBoard;
